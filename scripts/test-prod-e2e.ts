import { io, Socket } from "socket.io-client";

const BACKEND_URL = "https://ouk-khmer-backend-production.up.railway.app";

async function runRealProductionTest() {
  console.log(`\n==================================================`);
  console.log(`REAL PRODUCTION MULTIPLAYER E2E TEST`);
  console.log(`Target Backend: ${BACKEND_URL}`);
  console.log(`==================================================\n`);

  // 1. Healthcheck
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) {
    throw new Error(`Healthcheck failed with HTTP ${res.status}`);
  }
  const healthData = await res.json();
  console.log(`[PASS] 1. Live Backend Healthcheck OK:`, healthData);

  // 2. Connect 2 Devices via WebSocket (WSS)
  console.log(`\n[2] Connecting 2 Client Devices over WSS...`);
  const client1: Socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: false,
  });

  const client2: Socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: false,
  });

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      client1.on("connect", () => {
        console.log(`  -> Client 1 Connected (ID: ${client1.id})`);
        resolve();
      });
      client1.on("connect_error", reject);
    }),
    new Promise<void>((resolve, reject) => {
      client2.on("connect", () => {
        console.log(`  -> Client 2 Connected (ID: ${client2.id})`);
        resolve();
      });
      client2.on("connect_error", reject);
    }),
  ]);

  // 3. Create Private Room on Client 1
  console.log(`\n[3] Creating Private Room on Device 1...`);
  const roomCreatedPromise = new Promise((resolve) => client1.once("room:created", resolve));
  client1.emit("create:private", {
    playerName: "Prod_Device1_White",
    mode: "folk",
  });

  const roomCreated: any = await roomCreatedPromise;
  console.log(`  -> Room Created: PIN = ${roomCreated.pin}, RoomId = ${roomCreated.roomId}`);

  // 4. Join Private Room from Client 2
  console.log(`\n[4] Joining Room from Device 2 with PIN ${roomCreated.pin}...`);
  const gameStartPromise1 = new Promise((resolve) => client1.once("game:start", resolve));
  const gameStartPromise2 = new Promise((resolve) => client2.once("game:start", resolve));

  client2.emit("join:private", {
    pin: roomCreated.pin,
    playerName: "Prod_Device2_Black",
  });

  const [start1, start2]: any = await Promise.all([gameStartPromise1, gameStartPromise2]);
  console.log(`  -> Both devices received game:start event! RoomId = ${start1.roomId}`);
  console.log(`  -> Device 1 (White) assigned token: ${start1.sessionToken ? "VALID" : "NONE"}`);
  console.log(`  -> Device 2 (Black) assigned token: ${start2.sessionToken ? "VALID" : "NONE"}`);

  // 5. Execute Realtime Moves (White moves square 40 to 32)
  console.log(`\n[5] Executing Realtime Move from Device 1 (White)...`);
  const moveMovedPromise1 = new Promise((resolve) => client1.once("game:moved", resolve));
  const moveMovedPromise2 = new Promise((resolve) => client2.once("game:moved", resolve));

  client1.emit("game:move", {
    from: 40,
    to: 32,
  });

  const [moved1, moved2]: any = await Promise.all([moveMovedPromise1, moveMovedPromise2]);
  console.log(
    `  -> Device 1 received broadcast game:moved: from ${moved1.from} to ${moved1.to}, turn: ${moved1.turn}`,
  );
  console.log(
    `  -> Device 2 received broadcast game:moved: from ${moved2.from} to ${moved2.to}, turn: ${moved2.turn}`,
  );

  // 6. Draw Offer & Acceptance
  console.log(`\n[6] Testing Live Draw Offer & Acceptance...`);
  const drawOfferedPromise = new Promise((resolve) => client1.once("game:draw_offered", resolve));
  client2.emit("game:draw_offer");
  await drawOfferedPromise;
  console.log(`  -> Device 1 received game:draw_offered from Device 2`);

  const gameOverPromise1 = new Promise((resolve) => client1.once("game:over", resolve));
  const gameOverPromise2 = new Promise((resolve) => client2.once("game:over", resolve));

  client1.emit("game:draw_accept");
  const [over1, over2]: any = await Promise.all([gameOverPromise1, gameOverPromise2]);
  console.log(
    `  -> Both devices received game:over (reason: ${over1.reason}, winner: ${over1.winner})`,
  );

  // Clean up
  client1.disconnect();
  client2.disconnect();

  console.log(`\n==================================================`);
  console.log(`ALL REAL PRODUCTION MULTIPLAYER E2E TESTS PASSED 100%!`);
  console.log(`==================================================\n`);
  process.exit(0);
}

runRealProductionTest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
