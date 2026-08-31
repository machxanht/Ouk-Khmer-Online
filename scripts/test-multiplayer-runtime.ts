import { io as ClientIO } from "socket.io-client";
import { createRealtimeServer } from "../server/index";

let passed = 0;
let total = 0;
function testAssert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`[PASS] ${msg}`);
}

async function runRuntimeSuite() {
  console.log("==================================================");
  console.log("STARTING 2-CLIENT SOCKET RUNTIME INTEGRATION TEST");
  console.log("==================================================");

  const PORT = 3888;
  const server = createRealtimeServer({ port: PORT, corsOrigin: "*" });
  await server.start();
  testAssert(true, `1. Realtime Server started on port ${PORT}`);

  const clientA = ClientIO(`http://localhost:${PORT}`);
  const clientB = ClientIO(`http://localhost:${PORT}`);

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    clientA.on("connect", check);
    clientB.on("connect", check);
  });
  testAssert(true, "2. Both Client A and Client B connected");

  // Step 1: Client A creates private room
  const pin = await new Promise<string>((resolve) => {
    clientA.emit("create:private", { playerName: "Alice", rulesetId: "folk" });
    clientA.on("room:created", (data: any) => {
      testAssert(data.pin.length === 6, "3. Room created with valid 6-digit PIN");
      resolve(data.pin);
    });
  });

  // Step 2: Client B joins room
  await new Promise<void>((resolve) => {
    let ready = 0;
    const onStart = (data: any) => {
      testAssert(Boolean(data.board), `4. Game started for player ${data.color}`);
      ready++;
      if (ready === 2) resolve();
    };
    clientA.once("game:start", onStart);
    clientB.once("game:start", onStart);
    clientB.emit("join:private", { pin, playerName: "Bob" });
  });

  // Step 3: Client A moves 40 -> 32
  await new Promise<void>((resolve) => {
    clientB.once("game:moved", (payload: any) => {
      testAssert(payload.from === 40 && payload.to === 32, "5. Move synchronized to Client B");
      testAssert(payload.turn === "b", "6. Turn toggled to Black");
      resolve();
    });
    clientA.emit("game:move", { from: 40, to: 32 });
  });

  // Step 4: Client B offers draw
  await new Promise<void>((resolve) => {
    clientA.once("game:draw_offered", (data: any) => {
      testAssert(data.fromColor === "b", "7. Draw offer received by Client A");
      resolve();
    });
    clientB.emit("game:draw_offer");
  });

  // Step 5: Client A accepts draw
  await new Promise<void>((resolve) => {
    let overCount = 0;
    const onOver = (data: any) => {
      testAssert(
        data.winner === "draw" && data.reason === "draw_agreement",
        "8. Game ended in agreed draw",
      );
      overCount++;
      if (overCount === 2) resolve();
    };
    clientA.once("game:over", onOver);
    clientB.once("game:over", onOver);
    clientA.emit("game:draw_accept");
  });

  // Step 6: Rematch Request from Client A
  await new Promise<void>((resolve) => {
    clientB.once("game:rematch_offered", (data: any) => {
      testAssert(data.fromColor === "w", "9. Rematch offer received by Client B");
      resolve();
    });
    clientA.emit("game:rematch_request");
  });

  // Step 7: Client B accepts rematch -> color swap!
  await new Promise<void>((resolve) => {
    let rematchStartedCount = 0;
    clientA.once("game:start", (data: any) => {
      testAssert(data.color === "b", "10. Client A swapped to Black");
      rematchStartedCount++;
      if (rematchStartedCount === 2) resolve();
    });
    clientB.once("game:start", (data: any) => {
      testAssert(data.color === "w", "11. Client B swapped to White");
      rematchStartedCount++;
      if (rematchStartedCount === 2) resolve();
    });
    clientB.emit("game:rematch_request");
  });

  // Step 8: Matchmaking Queue (Folk) Test
  const clientC = ClientIO(`http://localhost:${PORT}`);
  const clientD = ClientIO(`http://localhost:${PORT}`);

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    clientC.on("connect", check);
    clientD.on("connect", check);
  });

  await new Promise<void>((resolve) => {
    let mmStarted = 0;
    const onMMStart = (data: any) => {
      testAssert(
        data.rulesetId === "folk",
        `12. Matchmaking paired into Folk mode for ${data.color}`,
      );
      mmStarted++;
      if (mmStarted === 2) resolve();
    };
    clientC.on("game:start", onMMStart);
    clientD.on("game:start", onMMStart);

    clientC.emit("matchmaking:join", { playerName: "MM_Alice", rulesetId: "folk" });
    clientD.emit("matchmaking:join", { playerName: "MM_Bob", rulesetId: "folk" });
  });

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  clientD.disconnect();
  await server.stop();

  console.log("\n==================================================");
  console.log(`ALL ${passed}/${total} RUNTIME INTEGRATION TESTS PASSED!`);
  console.log("==================================================");
  process.exit(0);
}

runRuntimeSuite().catch((err) => {
  console.error("Runtime suite error:", err);
  process.exit(1);
});
