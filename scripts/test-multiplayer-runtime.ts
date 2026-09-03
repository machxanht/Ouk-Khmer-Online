import crypto from "node:crypto";
import { io as ClientIO, type Socket } from "socket.io-client";

process.env.NODE_ENV = "test";
process.env.ALLOW_DEV_AUTH_TOKENS = "true";

const { createRealtimeServer } = await import("../server/index");
const { roomManager } = await import("../server/room-manager");

let passed = 0;
let total = 0;

function testAssert(condition: boolean, msg: string) {
  total++;
  if (!condition) throw new Error(`[FAIL] ${msg}`);
  passed++;
  console.log(`[PASS] ${msg}`);
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 5_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function waitForConnect(client: Socket, label: string) {
  if (client.connected) return Promise.resolve();
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    }),
    label,
  );
}

function nextEvent<T = any>(client: Socket, event: string, label: string): Promise<T> {
  return withTimeout(
    new Promise<T>((resolve) => {
      client.once(event, (data: T) => resolve(data));
    }),
    label,
  );
}

async function runRuntimeSuite() {
  console.log("==================================================");
  console.log("STARTING AUTHENTICATED SOCKET RUNTIME INTEGRATION TEST");
  console.log("==================================================");

  const port = 38_000 + crypto.randomInt(0, 1_000);
  const server = createRealtimeServer({ port, corsOrigin: "*" });
  const clients: Socket[] = [];

  const makeClient = () => {
    const client = ClientIO(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    clients.push(client);
    return client;
  };

  try {
    await server.start();
    testAssert(true, `1. Realtime server started on port ${port}`);

    let clientA = makeClient();
    const clientB = makeClient();
    await Promise.all([
      waitForConnect(clientA, "Client A connect"),
      waitForConnect(clientB, "Client B connect"),
    ]);
    testAssert(true, "2. Both authenticated test clients connected");

    const aliceToken = "test_token_runtime_alice";
    const bobToken = "test_token_runtime_bob";

    const roomCreated = nextEvent<any>(clientA, "room:created", "private room creation");
    clientA.emit("create:private", {
      playerName: "Alice",
      rulesetId: "folk",
      authToken: aliceToken,
    });
    const created = await roomCreated;
    testAssert(/^\d{6}$/.test(created.pin), "3. Authenticated private room created with 6-digit PIN");

    const startA = nextEvent<any>(clientA, "game:start", "Client A game:start");
    const startB = nextEvent<any>(clientB, "game:start", "Client B game:start");
    clientB.emit("join:private", {
      pin: created.pin,
      playerName: "Bob",
      authToken: bobToken,
    });
    const [gameA, gameB] = await Promise.all([startA, startB]);
    testAssert(Boolean(gameA.board) && gameA.color === "w", "4. Host started as White");
    testAssert(Boolean(gameB.board) && gameB.color === "b", "5. Guest started as Black");
    testAssert(Boolean(gameA.sessionToken) && Boolean(gameA.roomId), "6. Host received reconnect credentials");

    const movedForB = nextEvent<any>(clientB, "game:moved", "move sync to Client B");
    clientA.emit("game:move", { from: 40, to: 32 });
    const moved = await movedForB;
    testAssert(moved.from === 40 && moved.to === 32, "7. Legal move synchronized to opponent");
    testAssert(moved.turn === "b", "8. Authoritative turn toggled to Black");

    const reconnectRoomId = gameA.roomId as string;
    const reconnectToken = gameA.sessionToken as string;
    clientA.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const replacementA = makeClient();
    await waitForConnect(replacementA, "replacement Client A connect");
    const reconnectedEvent = nextEvent<any>(replacementA, "game:reconnected", "Client A reconnect");
    replacementA.emit("game:reconnect", {
      roomId: reconnectRoomId,
      sessionToken: reconnectToken,
    });
    const reconnected = await reconnectedEvent;
    testAssert(reconnected.color === "w", "9. Reconnect restored the correct player color");
    testAssert(reconnected.turn === "b", "10. Reconnect preserved authoritative game state");
    clientA = replacementA;

    const drawOffered = nextEvent<any>(clientA, "game:draw_offered", "draw offer delivery");
    clientB.emit("game:draw_offer");
    const offer = await drawOffered;
    testAssert(offer.fromColor === "b", "11. Draw offer delivered to opponent");

    const overA = nextEvent<any>(clientA, "game:over", "draw game:over A");
    const overB = nextEvent<any>(clientB, "game:over", "draw game:over B");
    clientA.emit("game:draw_accept");
    const [resultA, resultB] = await Promise.all([overA, overB]);
    testAssert(
      resultA.winner === "draw" && resultB.reason === "draw_agreement",
      "12. Agreed draw ended consistently for both players",
    );

    const rematchOffer = nextEvent<any>(clientB, "game:rematch_offered", "rematch offer");
    clientA.emit("game:rematch_request");
    const rematch = await rematchOffer;
    testAssert(rematch.fromColor === "w", "13. Rematch request reached opponent");

    const rematchStartA = nextEvent<any>(clientA, "game:start", "rematch start A");
    const rematchStartB = nextEvent<any>(clientB, "game:start", "rematch start B");
    clientB.emit("game:rematch_request");
    const [newGameA, newGameB] = await Promise.all([rematchStartA, rematchStartB]);
    testAssert(newGameA.color === "b", "14. Rematch swapped Client A to Black");
    testAssert(newGameB.color === "w", "15. Rematch swapped Client B to White");

    const clientC = makeClient();
    const clientD = makeClient();
    await Promise.all([
      waitForConnect(clientC, "Client C connect"),
      waitForConnect(clientD, "Client D connect"),
    ]);

    const matchC = nextEvent<any>(clientC, "game:start", "matchmaking C");
    const matchD = nextEvent<any>(clientD, "game:start", "matchmaking D");
    clientC.emit("matchmaking:join", {
      playerName: "MM Alice",
      rulesetId: "folk",
      authToken: "test_token_runtime_mm_alice",
    });
    clientD.emit("matchmaking:join", {
      playerName: "MM Bob",
      rulesetId: "folk",
      authToken: "test_token_runtime_mm_bob",
    });
    const [mmC, mmD] = await Promise.all([matchC, matchD]);
    testAssert(
      mmC.rulesetId === "folk" && mmD.rulesetId === "folk",
      "16. Authenticated Folk matchmaking paired both users",
    );
    testAssert(
      !mmC.opponent?.isBot && !mmD.opponent?.isBot,
      "17. Immediate human match was preferred over AI fallback",
    );

    console.log("\n==================================================");
    console.log(`ALL ${passed}/${total} AUTHENTICATED RUNTIME TESTS PASSED!`);
    console.log("==================================================");
  } finally {
    for (const client of clients) {
      if (client.connected) client.disconnect();
    }
    await server.stop().catch(() => undefined);
    roomManager.clear();
  }
}

runRuntimeSuite().then(
  () => process.exit(0),
  (err) => {
    console.error("Runtime suite error:", err);
    process.exit(1);
  },
);
