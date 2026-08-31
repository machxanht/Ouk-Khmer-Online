import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { attachRealtimeServer } from "./server/index";

function socketIoPlugin(): Plugin {
  return {
    name: "socket-io-plugin",
    configureServer(server) {
      if (server.httpServer) {
        attachRealtimeServer(server.httpServer);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss(), socketIoPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: ".output/public",
    emptyOutDir: true,
  },
});
