import { io, Socket } from "socket.io-client";
import {
  ChatMessagePayload,
  DrawOfferedPayload,
  GameMovedPayload,
  GameOverPayload,
  GameReconnectedPayload,
  GameStartPayload,
  GameTurnSkippedPayload,
  OnlineGameMode,
  PlayerStatusPayload,
  RematchOfferedPayload,
} from "./online-types";

const CONSOLIDATED_ONLINE_SERVER_URL =
  "https://ouk-khmer-backend-production-8a36.up.railway.app";
const LEGACY_PRODUCTION_SERVER_URLS = new Set([
  "https://ouk-khmer-backend-production.up.railway.app",
  "https://ouk-khmer-online-production.up.railway.app",
]);

function normalizeServerUrl(value?: string): string {
  return (value || "").trim().replace(/\/+$/, "");
}

function resolveOnlineServerUrl(explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  if (typeof window === "undefined") return "http://localhost:3000";

  const configuredUrl =
    (import.meta.env?.VITE_ONLINE_SERVER_URL as string) ||
    (import.meta.env?.VITE_SOCKET_URL as string) ||
    "";

  if (!import.meta.env?.PROD) {
    return configuredUrl || window.location.origin;
  }

  const normalizedConfiguredUrl = normalizeServerUrl(configuredUrl);
  if (!normalizedConfiguredUrl || LEGACY_PRODUCTION_SERVER_URLS.has(normalizedConfiguredUrl)) {
    return CONSOLIDATED_ONLINE_SERVER_URL;
  }

  return configuredUrl;
}

export type OnlineClientEventMap = {
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (err: Error) => void;
  "matchmaking:searching": (data: { queueSize: number }) => void;
  "matchmaking:left": () => void;
  "room:created": (data: { roomId: string; pin?: string; color: string; status: string }) => void;
  "room:error": (data: { code: string; message: string }) => void;
  "game:start": (data: GameStartPayload) => void;
  "game:reconnected": (data: GameReconnectedPayload) => void;
  "game:moved": (data: GameMovedPayload) => void;
  "game:turn_skipped": (data: GameTurnSkippedPayload) => void;
  "game:error": (data: { code: string; message: string }) => void;
  "game:over": (data: GameOverPayload) => void;
  "game:draw_offered": (data: DrawOfferedPayload) => void;
  "game:draw_declined": () => void;
  "game:rematch_offered": (data: RematchOfferedPayload) => void;
  "game:rematch_declined": () => void;
  "player:left": (data: { message: string }) => void;
  "player:status": (data: PlayerStatusPayload) => void;
  "chat:message": (data: ChatMessagePayload) => void;
  "system:online_count": (data: { onlineCount: number; rawCount: number }) => void;
};

export interface ClientDiagnosticEvent {
  timestamp: number;
  event: string;
  data?: unknown;
}

export class OnlineClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private debugTrace: ClientDiagnosticEvent[] = [];
  private readonly maxTraceSize = 100;

  private isDebugEnabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return (
        Boolean(import.meta.env?.DEV) ||
        (window as unknown as { __OUK_DEBUG__?: boolean }).__OUK_DEBUG__ === true ||
        window.location?.search?.includes("debug=1") ||
        localStorage.getItem("ouk_debug") === "true"
      );
    } catch {
      return false;
    }
  }

  private recordTrace(event: string, rawData?: unknown): void {
    let sanitizedData = rawData;
    if (rawData && typeof rawData === "object") {
      const copy: Record<string, unknown> = { ...(rawData as Record<string, unknown>) };
      if (typeof copy.sessionToken === "string") {
        copy.sessionToken = `${copy.sessionToken.slice(0, 5)}***`;
      }
      sanitizedData = copy;
    }

    const entry: ClientDiagnosticEvent = {
      timestamp: Date.now(),
      event,
      data: sanitizedData,
    };

    this.debugTrace.push(entry);
    if (this.debugTrace.length > this.maxTraceSize) {
      this.debugTrace.shift();
    }

    if (this.isDebugEnabled()) {
      const timeStr = new Date(entry.timestamp).toISOString().split("T")[1].slice(0, 8);
      console.log(`[OnlineClient ${timeStr}] ${event}`, sanitizedData ?? "");
    }
  }

  public getDebugTrace(): ClientDiagnosticEvent[] {
    return [...this.debugTrace];
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  public connect(url?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    const targetUrl = resolveOnlineServerUrl(url);

    this.socket = io(targetUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Forward internal socket events to registered listeners
    const forwardEvents = [
      "connect",
      "disconnect",
      "connect_error",
      "matchmaking:searching",
      "matchmaking:left",
      "room:created",
      "room:error",
      "game:start",
      "game:reconnected",
      "game:moved",
      "game:turn_skipped",
      "game:error",
      "game:over",
      "game:draw_offered",
      "game:draw_declined",
      "game:rematch_offered",
      "game:rematch_declined",
      "player:left",
      "player:status",
      "chat:message",
      "system:online_count",
    ];

    for (const evt of forwardEvents) {
      this.socket.on(evt, (...args: unknown[]) => {
        this.recordTrace(`IN:${evt}`, args[0]);
        const handlers = this.listeners.get(evt);
        if (handlers) {
          handlers.forEach((fn) => {
            try {
              fn(...args);
            } catch (err) {
              console.error(`[OnlineClient] Error in listener for event ${evt}:`, err);
            }
          });
        }
      });
    }

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.recordTrace("OUT:disconnect");
      this.socket.disconnect();
    }
  }

  public on<K extends keyof OnlineClientEventMap>(
    event: K,
    handler: OnlineClientEventMap[K],
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off<K extends keyof OnlineClientEventMap>(
    event: K,
    handler: OnlineClientEventMap[K],
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public joinMatchmaking(
    playerName: string,
    rulesetId: "folk" | "international" = "folk",
    mode?: OnlineGameMode,
    timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
    authToken?: string,
  ): void {
    this.ensureConnected();
    this.recordTrace("OUT:matchmaking:join", { playerName, rulesetId, mode, timeControl });
    this.socket?.emit("matchmaking:join", { playerName, rulesetId, mode, timeControl, authToken });
  }

  public leaveMatchmaking(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:matchmaking:leave");
      this.socket.emit("matchmaking:leave");
    }
  }

  public createPrivateRoom(
    playerName: string,
    rulesetId: "folk" | "international" = "folk",
    mode?: OnlineGameMode,
    timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number },
    authToken?: string,
  ): void {
    this.ensureConnected();
    this.recordTrace("OUT:create:private", { playerName, rulesetId, mode, timeControl });
    this.socket?.emit("create:private", { playerName, rulesetId, mode, timeControl, authToken });
  }

  public joinPrivateRoom(pin: string, playerName: string, authToken?: string): void {
    this.ensureConnected();
    this.recordTrace("OUT:join:private", { pin, playerName });
    this.socket?.emit("join:private", { pin, playerName, authToken });
  }

  public sendMove(from: number, to: number): void {
    this.ensureConnected();
    this.recordTrace("OUT:game:move", { from, to });
    this.socket?.emit("game:move", { from, to });
  }

  public resign(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:resign");
      this.socket.emit("game:resign");
    }
  }

  public offerDraw(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:draw_offer");
      this.socket.emit("game:draw_offer");
    }
  }

  public acceptDraw(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:draw_accept");
      this.socket.emit("game:draw_accept");
    }
  }

  public declineDraw(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:draw_decline");
      this.socket.emit("game:draw_decline");
    }
  }

  public requestRematch(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:rematch_request");
      this.socket.emit("game:rematch_request");
    }
  }

  public declineRematch(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:rematch_decline");
      this.socket.emit("game:rematch_decline");
    }
  }

  public sendChat(message: string): void {
    const trimmed = message.trim();
    if (trimmed && this.socket?.connected) {
      this.recordTrace("OUT:chat:send", { message: trimmed });
      this.socket.emit("chat:send", { message: trimmed });
    }
  }

  public leaveGame(): void {
    if (this.socket?.connected) {
      this.recordTrace("OUT:game:leave");
      this.socket.emit("game:leave");
    }
  }

  public reconnectGame(roomId: string, sessionToken: string, color?: string): void {
    this.ensureConnected();
    this.recordTrace("OUT:game:reconnect", { roomId, sessionToken, color });
    this.socket?.emit("game:reconnect", { roomId, sessionToken, color });
  }

  private ensureConnected(): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
  }
}

export const onlineClient = new OnlineClient();
