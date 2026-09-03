import { createRealtimeServer } from "./index";
import { installSocketSecurity, resolveCorsOrigin } from "./socket-security";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const corsOrigin = resolveCorsOrigin();

console.log(
  `[Socket Server] Initializing on 0.0.0.0:${port} (CORS: ${
    Array.isArray(corsOrigin) ? corsOrigin.join(", ") : corsOrigin
  })`,
);

const server = createRealtimeServer({
  port,
  corsOrigin,
});

// Packet-level abuse controls are installed before the listener starts accepting traffic.
installSocketSecurity(server.io);

server
  .start()
  .then(() => {
    console.log(`[Socket Server] Online and ready for multiplayer connections.`);
    console.log(`[Socket Server] Health endpoint: http://0.0.0.0:${port}/health`);
  })
  .catch((err) => {
    console.error(`[Socket Server] Failed to start:`, err);
    process.exit(1);
  });

// Handle graceful termination
const handleShutdown = async (signal: string) => {
  console.log(`[Socket Server] Received ${signal}, shutting down gracefully...`);
  try {
    await server.stop();
    console.log(`[Socket Server] Closed all connections and stopped successfully.`);
    process.exit(0);
  } catch (err) {
    console.error(`[Socket Server] Error during shutdown:`, err);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
