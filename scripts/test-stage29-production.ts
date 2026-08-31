import { io, Socket } from "socket.io-client";

const BACKEND_URL = "https://ouk-khmer-backend-production.up.railway.app";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStage29ProductionHardeningTests() {
  console.log(`\n========================================================`);
  console.log(`STAGE 29: FULL PRODUCTION HARDENING LIVE E2E SUITE`);
  console.log(`Target Railway Backend: ${BACKEND_URL}`);
  console.log(`========================================================\n`);

  // --- TEST 1: Healthcheck ---
  const healthRes = await fetch(`${BACKEND_URL}/health`);
  if (!healthRes.ok) throw new Error(`Healthcheck failed: ${healthRes.status}`);
  const healthData = await healthRes.json();
  console.log(`[PASS] 1. Backend Healthcheck Live:`, healthData);

  // --- TEST 2: Folk 60m + AFK Mode Matching & Move Execution ---
  console.log(`\n[2] Testing Folk 60m + AFK Match & Move Execution...`);
  const c1: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });
  const c2: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });

  await Promise.all([
    new Promise<void>((res) => c1.once("connect", res)),
    new Promise<void>((res) => c2.once("connect", res)),
  ]);

  const p1RoomCreated = new Promise<any>((res) => c1.once("room:created", res));
  c1.emit("create:private", {
    playerName: "Device1_Folk",
    mode: "folk",
  });
  const roomData = await p1RoomCreated;
  console.log(`  -> Room Created (Folk): PIN = ${roomData.pin}`);

  const p1Start = new Promise<any>((res) => c1.once("game:start", res));
  const p2Start = new Promise<any>((res) => c2.once("game:start", res));
  c2.emit("join:private", {
    pin: roomData.pin,
    playerName: "Device2_Folk",
  });

  const [start1, start2] = await Promise.all([p1Start, p2Start]);
  console.log(
    `  -> Folk Match Started. afkEnabled: ${start1.afkEnabled} (Expected: true), rulesetId: ${start1.rulesetId}`,
  );
  if (start1.afkEnabled !== true) throw new Error("Folk mode must have afkEnabled=true");

  // Execute White move (square 40 to 32)
  const p1Moved = new Promise<any>((res) => c1.once("game:moved", res));
  const p2Moved = new Promise<any>((res) => c2.once("game:moved", res));
  c1.emit("game:move", { from: 40, to: 32 });
  const [m1, m2] = await Promise.all([p1Moved, p2Moved]);
  console.log(`  -> Move successful: turn is now ${m1.turn}`);

  // Test Resignation
  const p1Over = new Promise<any>((res) => c1.once("game:over", res));
  const p2Over = new Promise<any>((res) => c2.once("game:over", res));
  c2.emit("game:resign");
  const [o1, o2] = await Promise.all([p1Over, p2Over]);
  console.log(`  -> Resignation complete: reason = ${o1.reason}, winner = ${o1.winner}`);
  if (o1.winner !== "w") throw new Error("Expected White to win on Black resignation");

  c1.disconnect();
  c2.disconnect();
  console.log(`[PASS] 2. Folk 60m + AFK & Resign verified.`);

  // --- TEST 3: International Blitz (5m — NO AFK) ---
  console.log(`\n[3] Testing International Blitz (5m — NO AFK)...`);
  const b1: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });
  const b2: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });

  await Promise.all([
    new Promise<void>((res) => b1.once("connect", res)),
    new Promise<void>((res) => b2.once("connect", res)),
  ]);

  const b1Room = new Promise<any>((res) => b1.once("room:created", res));
  b1.emit("create:private", {
    playerName: "Blitz_White",
    mode: "blitz",
  });
  const blitzRoom = await b1Room;

  const b1Start = new Promise<any>((res) => b1.once("game:start", res));
  const b2Start = new Promise<any>((res) => b2.once("game:start", res));
  b2.emit("join:private", {
    pin: blitzRoom.pin,
    playerName: "Blitz_Black",
  });

  const [bs1, bs2] = await Promise.all([b1Start, b2Start]);
  console.log(
    `  -> Blitz Match Started. afkEnabled: ${bs1.afkEnabled} (Expected: false), clocks.w: ${bs1.clocks?.w}ms`,
  );
  if (bs1.afkEnabled === true) throw new Error("Blitz mode must have afkEnabled=false");
  if (bs1.clocks?.w !== 300000) throw new Error("Blitz clocks must be 300000ms (5m)");

  // Test Draw offer & Accept in Blitz
  const b1Draw = new Promise<any>((res) => b1.once("game:draw_offered", res));
  b2.emit("game:draw_offer");
  await b1Draw;
  console.log(`  -> Draw offered received by White`);

  const b1Over = new Promise<any>((res) => b1.once("game:over", res));
  const b2Over = new Promise<any>((res) => b2.once("game:over", res));
  b1.emit("game:draw_accept");
  const [bo1, bo2] = await Promise.all([b1Over, b2Over]);
  console.log(`  -> Draw agreement reached: winner = ${bo1.winner}, reason = ${bo1.reason}`);

  // Test Rematch Offer & Accept with color swap
  console.log(`  -> Testing Rematch with Color Swap...`);
  const b1RematchOffered = new Promise<any>((res) => b1.once("game:rematch_offered", res));
  b2.emit("game:rematch_request");
  await b1RematchOffered;

  const b1RematchStart = new Promise<any>((res) => b1.once("game:start", res));
  const b2RematchStart = new Promise<any>((res) => b2.once("game:start", res));
  b1.emit("game:rematch_request");
  const [br1, br2] = await Promise.all([b1RematchStart, b2RematchStart]);

  console.log(
    `  -> Rematch Started! Device 1 previous White -> now: ${br1.color}, Device 2 previous Black -> now: ${br2.color}`,
  );
  if (br1.color !== "b" || br2.color !== "w") {
    throw new Error("Rematch must swap player colors!");
  }

  b1.disconnect();
  b2.disconnect();
  console.log(`[PASS] 3. International Blitz (5m No AFK), Draw & Rematch verified.`);

  // --- TEST 4: Device Sleep / Wake Reconnection with SessionToken ---
  console.log(`\n[4] Testing Device Sleep / Wake Reconnection Simulation...`);
  const r1: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });
  const r2: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });

  await Promise.all([
    new Promise<void>((res) => r1.once("connect", res)),
    new Promise<void>((res) => r2.once("connect", res)),
  ]);

  const r1Room = new Promise<any>((res) => r1.once("room:created", res));
  r1.emit("create:private", {
    playerName: "Device1_SleepTest",
    mode: "folk",
  });
  const reconnectRoom = await r1Room;

  const r1Start = new Promise<any>((res) => r1.once("game:start", res));
  const r2Start = new Promise<any>((res) => r2.once("game:start", res));
  r2.emit("join:private", {
    pin: reconnectRoom.pin,
    playerName: "Device2_SleepTest",
  });

  const [rs1, rs2] = await Promise.all([r1Start, r2Start]);
  const sessionToken1 = rs1.sessionToken;
  const roomId = rs1.roomId;
  console.log(`  -> Match Started. RoomId = ${roomId}, Device 1 SessionToken = ${sessionToken1}`);

  // Device 1 goes to sleep (socket disconnects)
  console.log(`  -> Device 1 simulates screen lock / device sleep (socket disconnect)...`);
  const p2OppStatus = new Promise<any>((res) => r2.once("player:status", res));
  r1.disconnect();
  const oppStatus = await p2OppStatus;
  console.log(`  -> Device 2 received player:status: connected = ${oppStatus.connected}`);

  await sleep(1000);

  // Device 1 wakes up with a fresh socket connection and performs game:reconnect
  console.log(`  -> Device 1 wakes up and reconnects with sessionToken...`);
  const r1Resumed: Socket = io(BACKEND_URL, { transports: ["websocket"], reconnection: false });
  await new Promise<void>((res) => r1Resumed.once("connect", res));

  const r1Reconnected = new Promise<any>((res) => r1Resumed.once("game:reconnected", res));
  const p2OppResumed = new Promise<any>((res) => r2.once("player:status", res));

  r1Resumed.emit("game:reconnect", {
    roomId,
    sessionToken: sessionToken1,
    color: "w",
  });

  const [reconnectedData, oppResumedStatus] = await Promise.all([r1Reconnected, p2OppResumed]);
  console.log(
    `  -> Device 1 successfully restored match state! Color = ${reconnectedData.color}, Turn = ${reconnectedData.turn}`,
  );
  console.log(
    `  -> Device 2 informed of opponent reconnect: connected = ${oppResumedStatus.connected}`,
  );

  // Make move on resumed connection to ensure full playability
  const resumeMoved1 = new Promise<any>((res) => r1Resumed.once("game:moved", res));
  const resumeMoved2 = new Promise<any>((res) => r2.once("game:moved", res));
  r1Resumed.emit("game:move", { from: 40, to: 32 });
  const [rm1, rm2] = await Promise.all([resumeMoved1, resumeMoved2]);
  console.log(`  -> Move made after resume! From ${rm1.from} to ${rm1.to}, turn: ${rm1.turn}`);

  r1Resumed.disconnect();
  r2.disconnect();
  console.log(`[PASS] 4. Device sleep / wake session restoration verified.`);

  console.log(`\n========================================================`);
  console.log(`ALL PRODUCTION HARDENING TESTS PASSED WITH 100% SUCCESS!`);
  console.log(`========================================================\n`);
  process.exit(0);
}

runStage29ProductionHardeningTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
