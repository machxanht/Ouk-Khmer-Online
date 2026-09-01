import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { matchmakingManager } from "./matchmaking-manager";
import { roomManager } from "./room-manager";
import { serverLogger } from "./logger";
import { authVerifier } from "./auth-verifier";
import { aiBotManager } from "./ai-bot-manager";

export interface RealtimeServerOptions {
  port?: number;
  corsOrigin?: string | string[];
}

export function registerSocketHandlers(io: SocketIOServer) {
  const onRoomTimeout = (
    r: any,
    winner: any,
    timedOutPlayer: any,
    reason: "timeout" | "afk_timeout" = "timeout",
  ) => {
    serverLogger.info("GAME_OVER", {
      roomId: r.id,
      details: {
        winner,
        reason,
        timedOutPlayer,
      },
    });

    io.to(r.id).emit("game:over", {
      winner,
      reason,
      result: {
        winner,
        reason,
        timedOutPlayer,
      },
    });
  };

  const onTurnSkipped = (
    r: any,
    skippedColor: any,
    nextTurn: any,
    afkStrikes: { w: number; b: number },
  ) => {
    io.to(r.id).emit("game:turn_skipped", {
      roomId: r.id,
      turn: nextTurn,
      skippedColor,
      afkStrikes,
      clocks: r.gameState.clocks,
      lastTurnTimestamp: r.gameState.lastTurnTimestamp,
      reason: "afk_skip",
    });
  };

  io.on("connection", (socket: Socket) => {
    serverLogger.debug("SOCKET_CONNECT", { socketId: socket.id });
    // 1. RANDOM MATCHMAKING
    socket.on(
      "matchmaking:join",
      async (payload?: {
        playerName?: string;
        rulesetId?: "folk" | "international";
        mode?: "folk" | "international" | "blitz";
        timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number };
        authToken?: string;
      }) => {
        let name = payload?.playerName?.trim() || "Player";
        let authMeta:
          { uid?: string; photoURL?: string | null; emailVerified?: boolean } | undefined;

        if (payload?.authToken) {
          const authUser = await authVerifier.verifyToken(payload.authToken);
          if (authUser) {
            authMeta = {
              uid: authUser.uid,
              photoURL: authUser.photoURL,
              emailVerified: authUser.emailVerified,
            };
            if (authUser.displayName) {
              name = authUser.displayName;
            }
          }
        }

        const mode =
          payload?.mode ||
          (payload?.timeControl?.type === "blitz" || payload?.timeControl?.initialSeconds === 300
            ? "blitz"
            : payload?.rulesetId === "international"
              ? "international"
              : "folk");

        const rulesetId = mode === "folk" ? "folk" : "international";
        const timeControl =
          mode === "blitz"
            ? { type: "blitz" as const, initialSeconds: 300 }
            : { type: "standard" as const, initialSeconds: 3600 };

        const result = matchmakingManager.joinQueue(
          socket.id,
          name,
          rulesetId,
          timeControl,
          mode,
          authMeta,
        );

        if (result.matched) {
          const { p1, p2, rulesetId: matchRulesetId, timeControl: matchTimeControl } = result;
          aiBotManager.cancelFallback(p1.socketId);
          aiBotManager.cancelFallback(p2.socketId);

          const room = roomManager.createMatchmakingRoom(p1, p2, matchRulesetId, matchTimeControl);

          const socket1 = io.sockets.sockets.get(p1.socketId);
          const socket2 = io.sockets.sockets.get(p2.socketId);

          socket1?.join(room.id);
          socket2?.join(room.id);

          const game = room.gameState!;

          // Start authoritative clock timer for the room
          roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

          // Send game:start to White (P1)
          socket1?.emit("game:start", {
            roomId: room.id,
            sessionToken: room.players.w?.sessionToken,
            color: "w",
            opponent: { name: p2.name, uid: p2.uid, photoURL: p2.photoURL },
            board: game.board,
            turn: game.turn,
            status: game.status,
            isCheck: game.isCheck,
            countingState: game.countingState,
            rulesetId: game.rulesetId,
            clocks: game.clocks,
            lastTurnTimestamp: game.lastTurnTimestamp,
            afkStrikes: game.afkStrikes,
            afkEnabled: game.afkEnabled,
          });

          // Send game:start to Black (P2)
          socket2?.emit("game:start", {
            roomId: room.id,
            sessionToken: room.players.b?.sessionToken,
            color: "b",
            opponent: { name: p1.name, uid: p1.uid, photoURL: p1.photoURL },
            board: game.board,
            turn: game.turn,
            status: game.status,
            isCheck: game.isCheck,
            countingState: game.countingState,
            rulesetId: game.rulesetId,
            clocks: game.clocks,
            lastTurnTimestamp: game.lastTurnTimestamp,
            afkStrikes: game.afkStrikes,
            afkEnabled: game.afkEnabled,
          });
        } else {
          socket.emit("matchmaking:searching", { queueSize: result.queueSize });
          aiBotManager.scheduleFallback(
            socket,
            { name, rulesetId, mode, timeControl, authMeta },
            io,
            onRoomTimeout,
            onTurnSkipped,
          );
        }
      },
    );

    socket.on("matchmaking:leave", () => {
      aiBotManager.cancelFallback(socket.id);
      matchmakingManager.leaveQueue(socket.id);
      socket.emit("matchmaking:left");
    });

    // 2. PRIVATE ROOM
    socket.on(
      "create:private",
      async (payload?: {
        playerName?: string;
        rulesetId?: "folk" | "international";
        mode?: "folk" | "international" | "blitz";
        timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number };
        authToken?: string;
      }) => {
        let name = payload?.playerName?.trim() || "Host";
        let authMeta:
          { uid?: string; photoURL?: string | null; emailVerified?: boolean } | undefined;

        if (payload?.authToken) {
          const authUser = await authVerifier.verifyToken(payload.authToken);
          if (authUser) {
            authMeta = {
              uid: authUser.uid,
              photoURL: authUser.photoURL,
              emailVerified: authUser.emailVerified,
            };
            if (authUser.displayName) {
              name = authUser.displayName;
            }
          }
        }

        const mode =
          payload?.mode ||
          (payload?.timeControl?.type === "blitz" || payload?.timeControl?.initialSeconds === 300
            ? "blitz"
            : payload?.rulesetId === "international"
              ? "international"
              : "folk");

        const rulesetId = mode === "folk" ? "folk" : "international";
        const timeControl =
          mode === "blitz"
            ? { type: "blitz" as const, initialSeconds: 300 }
            : { type: "standard" as const, initialSeconds: 3600 };

        const room = roomManager.createPrivateRoom(
          socket.id,
          name,
          rulesetId,
          timeControl,
          authMeta,
        );
        socket.join(room.id);

        socket.emit("room:created", {
          roomId: room.id,
          pin: room.pin,
          color: "w",
          status: "waiting",
          rulesetId: room.rulesetId,
          timeControl: room.timeControl,
        });
      },
    );

    socket.on(
      "join:private",
      async (payload: { pin: string; playerName?: string; authToken?: string }) => {
        const pin = payload?.pin;
        let name = payload?.playerName?.trim() || "Guest";
        let authMeta:
          { uid?: string; photoURL?: string | null; emailVerified?: boolean } | undefined;

        if (!pin) {
          socket.emit("room:error", {
            code: "INVALID_PIN",
            message: "Vui lòng nhập mã phòng.",
          });
          return;
        }

        if (payload?.authToken) {
          const authUser = await authVerifier.verifyToken(payload.authToken);
          if (authUser) {
            authMeta = {
              uid: authUser.uid,
              photoURL: authUser.photoURL,
              emailVerified: authUser.emailVerified,
            };
            if (authUser.displayName) {
              name = authUser.displayName;
            }
          }
        }

        const result = roomManager.joinPrivateRoom(pin, socket.id, name, authMeta);
        if (!result.success) {
          socket.emit("room:error", {
            code: result.code,
            message: result.message,
          });
          return;
        }

        const room = result.room;
        socket.join(room.id);

        const hostSocket = io.sockets.sockets.get(room.players.w!.socketId);
        const guestSocket = socket;
        const game = room.gameState!;

        // Start authoritative clock timer for the room
        roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

        // Send game:start to Host (White)
        hostSocket?.emit("game:start", {
          roomId: room.id,
          pin: room.pin,
          sessionToken: room.players.w?.sessionToken,
          color: "w",
          opponent: {
            name: room.players.b!.name,
            uid: room.players.b!.uid,
            photoURL: room.players.b!.photoURL,
          },
          board: game.board,
          turn: game.turn,
          status: game.status,
          isCheck: game.isCheck,
          countingState: game.countingState,
          rulesetId: game.rulesetId,
          clocks: game.clocks,
          lastTurnTimestamp: game.lastTurnTimestamp,
          afkStrikes: game.afkStrikes,
          afkEnabled: game.afkEnabled,
        });

        // Send game:start to Guest (Black)
        guestSocket.emit("game:start", {
          roomId: room.id,
          pin: room.pin,
          sessionToken: room.players.b?.sessionToken,
          color: "b",
          opponent: {
            name: room.players.w!.name,
            uid: room.players.w!.uid,
            photoURL: room.players.w!.photoURL,
          },
          board: game.board,
          turn: game.turn,
          status: game.status,
          isCheck: game.isCheck,
          countingState: game.countingState,
          rulesetId: game.rulesetId,
          clocks: game.clocks,
          lastTurnTimestamp: game.lastTurnTimestamp,
          afkStrikes: game.afkStrikes,
          afkEnabled: game.afkEnabled,
        });
      },
    );

    // 3. IN-GAME ACTIONS
    socket.on("game:move", (payload: { from: number; to: number }) => {
      const moveResult = roomManager.handleMove(socket.id, payload?.from, payload?.to);

      if (!moveResult.success) {
        socket.emit("game:error", moveResult.error);
        if (moveResult.timeout) {
          const room = roomManager.getRoomBySocket(socket.id);
          if (room) {
            const playerColor = roomManager.getPlayerColor(room, socket.id);
            const winner = playerColor === "w" ? "b" : "w";
            io.to(room.id).emit("game:over", {
              winner,
              reason: "timeout",
              result: {
                winner,
                reason: "timeout",
                timedOutPlayer: playerColor,
              },
            });
          }
        }
        return;
      }

      // Broadcast move to both players
      io.to(moveResult.room.id).emit("game:moved", moveResult.movedPayload);

      // Check if game has ended
      if (moveResult.room.status === "finished") {
        const game = moveResult.room.gameState!;
        const winner =
          game.result?.winner ||
          (game.status === "checkmate" || game.status === "king_captured"
            ? game.turn === "w"
              ? "b"
              : "w"
            : "draw");
        const reason =
          game.result?.reason ||
          (game.status === "king_captured"
            ? "king_capture"
            : game.status === "checkmate"
              ? "checkmate"
              : game.status === "stalemate"
                ? "stalemate"
                : game.status === "timeout"
                  ? "timeout"
                  : "game_end");

        serverLogger.info("GAME_OVER", {
          roomId: moveResult.room.id,
          details: {
            winner,
            reason,
            turn: game.turn,
          },
        });

        io.to(moveResult.room.id).emit("game:over", {
          winner,
          reason,
          result: game.result,
        });
      } else {
        // Continue match: Schedule timer for next turn
        roomManager.startTurnTimer(moveResult.room, onRoomTimeout, onTurnSkipped);

        // If playing against bot and now it's bot's turn, trigger bot thinking
        if (moveResult.room.isBotRoom) {
          const botColor = moveResult.room.players.w?.isBot
            ? "w"
            : moveResult.room.players.b?.isBot
              ? "b"
              : null;
          if (botColor && moveResult.room.gameState?.turn === botColor) {
            aiBotManager.triggerBotMove(
              moveResult.room,
              botColor,
              io,
              onRoomTimeout,
              onTurnSkipped,
            );
          }
        }
      }
    });

    socket.on("game:resign", () => {
      const resignResult = roomManager.handleResign(socket.id);
      if (resignResult.success) {
        serverLogger.info("GAME_OVER", {
          roomId: resignResult.room.id,
          details: {
            winner: resignResult.winnerColor,
            reason: "resignation",
          },
        });

        io.to(resignResult.room.id).emit("game:over", {
          winner: resignResult.winnerColor,
          reason: "resignation",
          result: {
            winner: resignResult.winnerColor,
            reason: "resignation",
          },
        });
      }
    });

    // 4. DRAW OFFER & ACCEPTANCE
    socket.on("game:draw_offer", () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (room?.isBotRoom) {
        aiBotManager.handleBotDrawOffer(room, io);
        return;
      }

      const result = roomManager.handleDrawOffer(socket.id);
      if (result.success) {
        io.to(result.opponentSocketId).emit("game:draw_offered", {
          fromColor: result.offererColor,
        });
      } else {
        socket.emit("game:error", { code: "DRAW_ERROR", message: result.error });
      }
    });

    socket.on("game:draw_accept", () => {
      const result = roomManager.handleDrawAccept(socket.id);
      if (result.success) {
        io.to(result.room.id).emit("game:over", {
          winner: "draw",
          reason: "draw_agreement",
          result: {
            winner: "draw",
            reason: "draw_agreement",
          },
        });
      } else {
        socket.emit("game:error", { code: "DRAW_ERROR", message: result.error });
      }
    });

    socket.on("game:draw_decline", () => {
      const result = roomManager.handleDrawDecline(socket.id);
      if (result.success) {
        io.to(result.opponentSocketId).emit("game:draw_declined");
      }
    });

    // 5. REMATCH FLOW
    socket.on("game:rematch_request", () => {
      const currentRoom = roomManager.getRoomBySocket(socket.id);
      if (currentRoom?.isBotRoom) {
        aiBotManager.handleBotRematch(currentRoom, io, onRoomTimeout, onTurnSkipped);
        return;
      }

      const result = roomManager.handleRematchRequest(socket.id, onRoomTimeout, onTurnSkipped);

      if (result.type === "rematch_started") {
        const { room, playerW, playerB } = result;
        const socketW = io.sockets.sockets.get(playerW.socketId);
        const socketB = io.sockets.sockets.get(playerB.socketId);
        const game = room.gameState!;

        // Send game:start to White
        socketW?.emit("game:start", {
          roomId: room.id,
          pin: room.pin,
          sessionToken: playerW.sessionToken,
          color: "w",
          opponent: { name: playerB.name },
          board: game.board,
          turn: game.turn,
          status: game.status,
          isCheck: game.isCheck,
          countingState: game.countingState,
          rulesetId: game.rulesetId,
          clocks: game.clocks,
          lastTurnTimestamp: game.lastTurnTimestamp,
          afkStrikes: game.afkStrikes,
          afkEnabled: game.afkEnabled,
        });

        // Send game:start to Black
        socketB?.emit("game:start", {
          roomId: room.id,
          pin: room.pin,
          sessionToken: playerB.sessionToken,
          color: "b",
          opponent: { name: playerW.name },
          board: game.board,
          turn: game.turn,
          status: game.status,
          isCheck: game.isCheck,
          countingState: game.countingState,
          rulesetId: game.rulesetId,
          clocks: game.clocks,
          lastTurnTimestamp: game.lastTurnTimestamp,
          afkStrikes: game.afkStrikes,
          afkEnabled: game.afkEnabled,
        });
      } else if (result.type === "rematch_offered") {
        io.to(result.opponentSocketId).emit("game:rematch_offered", {
          fromColor: result.fromColor,
        });
      } else if (result.type === "error") {
        socket.emit("game:error", { code: "REMATCH_ERROR", message: result.error });
      }
    });

    socket.on("game:rematch_decline", () => {
      const result = roomManager.handleRematchDecline(socket.id);
      if (result.success) {
        io.to(result.opponentSocketId).emit("game:rematch_declined");
      }
    });

    // 6. SESSION RECONNECT & RESUME
    socket.on(
      "game:reconnect",
      (payload?: { roomId?: string; sessionToken?: string; color?: string }) => {
        const roomId = payload?.roomId;
        if (!roomId) {
          socket.emit("game:error", {
            code: "RECONNECT_FAILED",
            message: "Mã phòng không hợp lệ.",
          });
          return;
        }

        const result = roomManager.handleReconnect(
          socket.id,
          roomId,
          payload.sessionToken,
          payload.color,
        );

        if (!result.success) {
          socket.emit("game:error", {
            code: "RECONNECT_FAILED",
            message: result.error,
          });
          return;
        }

        const { room, player, opponent, staleSocketId } = result;
        if (staleSocketId) {
          const staleSocket = io.sockets.sockets.get(staleSocketId);
          if (staleSocket) {
            staleSocket.leave(room.id);
          }
        }
        socket.join(room.id);
        const game = room.gameState!;

        // Send full state snapshot to reconnecting player
        socket.emit("game:reconnected", {
          roomId: room.id,
          pin: room.pin,
          sessionToken: player.sessionToken,
          color: player.color,
          opponent: {
            name: opponent?.name || "Đối thủ",
            connected: opponent?.connected !== false,
          },
          board: game.board,
          turn: game.turn,
          status: game.status,
          isCheck: game.isCheck,
          countingState: game.countingState,
          rulesetId: game.rulesetId,
          clocks: game.clocks,
          lastTurnTimestamp: game.lastTurnTimestamp,
          afkStrikes: game.afkStrikes,
          afkEnabled: game.afkEnabled,
          lastMove: game.lastMove,
        });

        // Notify opponent that player is back online
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("player:status", {
            color: player.color,
            connected: true,
            message: "Đối thủ đã kết nối lại.",
          });
        }
      },
    );

    // 7. REALTIME IN-GAME CHAT
    socket.on("chat:send", (payload?: { message?: string; text?: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) {
        return;
      }

      const rawText =
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.text === "string"
            ? payload.text
            : "";
      const cleanText = rawText.trim();

      // Reject empty or messages exceeding 200 characters
      if (!cleanText || cleanText.length === 0 || cleanText.length > 200) {
        return;
      }

      const senderColor = roomManager.getPlayerColor(room, socket.id);
      let senderName = "Player";
      if (senderColor === "w" && room.players.w) {
        senderName = room.players.w.name;
      } else if (senderColor === "b" && room.players.b) {
        senderName = room.players.b.name;
      }

      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        senderId: socket.id,
        senderName,
        senderColor,
        text: cleanText,
        timestamp: Date.now(),
      };

      // Broadcast exclusively to players in the specific room
      io.to(room.id).emit("chat:message", chatMessage);
    });

    socket.on("game:leave", () => {
      matchmakingManager.leaveQueue(socket.id);
      const leaveResult = roomManager.handleManualLeave(socket.id);
      if (leaveResult && leaveResult.type === "playing_game_over") {
        io.to(leaveResult.opponentSocketId).emit("game:over", {
          winner: leaveResult.winnerColor,
          reason: "player_left",
          result: {
            winner: leaveResult.winnerColor,
            reason: "player_left",
          },
        });
        io.to(leaveResult.opponentSocketId).emit("player:left", {
          message: "Đối thủ đã rời trận.",
        });
      } else if (leaveResult && leaveResult.type === "finished_player_left") {
        io.to(leaveResult.opponentSocketId).emit("game:rematch_declined");
        io.to(leaveResult.opponentSocketId).emit("player:left", {
          message: "Đối thủ đã rời phòng.",
        });
      }
    });

    // 8. DISCONNECT (Device sleep, tab switch, network drop)
    socket.on("disconnect", () => {
      aiBotManager.cancelFallback(socket.id);
      matchmakingManager.leaveQueue(socket.id);
      const dcResult = roomManager.handleDisconnect(socket.id);
      if (dcResult && dcResult.type === "player_disconnected") {
        // Notify opponent that player temporarily dropped connection, but match continues!
        io.to(dcResult.opponentSocketId).emit("player:status", {
          color: dcResult.disconnectedColor,
          connected: false,
          message: "Đối thủ tạm thời mất kết nối...",
        });
      }
    });
  });
}

/**
 * Attaches Socket.IO to an existing HTTP server (e.g. in Vite plugin).
 */
export function attachRealtimeServer(httpServer: http.Server): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);
  return io;
}

/**
 * Creates a standalone HTTP + Socket.IO server.
 */
export function createRealtimeServer(options: RealtimeServerOptions = {}) {
  const port = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
  const corsOrigin = options.corsOrigin ?? "*";

  const httpServer = http.createServer((req, res) => {
    // Health check endpoint with operator diagnostics & metrics
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          server: "ouk-chatrang-authoritative",
          uptime: process.uptime(),
          timestamp: Date.now(),
          metrics: {
            activeRooms: roomManager.getRoomCount(),
            activePins: roomManager.getActivePinCount(),
            socketMappings: roomManager.getSocketMappingCount(),
            matchmakingQueue: matchmakingManager.getQueueSize(),
            bufferedLogs: serverLogger.getLogs().length,
          },
        }),
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  registerSocketHandlers(io);

  return {
    httpServer,
    io,
    start: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.listen(port, "0.0.0.0", () => {
          resolve();
        });
        httpServer.on("error", reject);
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        io.close(() => {
          resolve();
        });
      }),
  };
}
