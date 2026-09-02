import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { matchmakingManager } from "./matchmaking-manager";
import { roomManager } from "./room-manager";
import { serverLogger } from "./logger";
import { authVerifier, type AuthenticatedUser } from "./auth-verifier";
import { aiBotManager } from "./ai-bot-manager";
import { rankedManager } from "./ranked-manager";

export interface RealtimeServerOptions {
  port?: number;
  corsOrigin?: string | string[];
}

function emitAuthRequired(socket: Socket, surface: "matchmaking" | "room") {
  const payload = {
    code: "AUTH_REQUIRED",
    message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  };
  if (surface === "room") socket.emit("room:error", payload);
  else socket.emit("game:error", payload);
}

async function requireVerifiedUser(
  socket: Socket,
  token: string | undefined,
  surface: "matchmaking" | "room",
): Promise<AuthenticatedUser | null> {
  const user = await authVerifier.verifyToken(token);
  if (!user) emitAuthRequired(socket, surface);
  return user;
}

function authMetaFromUser(user: AuthenticatedUser) {
  return {
    uid: user.uid,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

export function registerSocketHandlers(io: SocketIOServer) {
  const broadcastOnlineCount = () => {
    const realCount = io.sockets.sockets.size || 0;
    io.emit("system:online_count", {
      realCount,
      onlineCount: realCount + 50,
    });
  };

  setInterval(broadcastOnlineCount, 15000);

  const persistRankedResult = (
    room: any,
    winner: "w" | "b" | "draw",
    reason: string,
  ) => {
    void rankedManager.finalize(room, winner, reason);
  };

  const onRoomTimeout = (
    r: any,
    winner: any,
    timedOutPlayer: any,
    reason: "timeout" | "afk_timeout" = "timeout",
  ) => {
    serverLogger.info("GAME_OVER", {
      roomId: r.id,
      details: { winner, reason, timedOutPlayer },
    });

    persistRankedResult(r, winner, reason);
    io.to(r.id).emit("game:over", {
      winner,
      reason,
      result: { winner, reason, timedOutPlayer },
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
    broadcastOnlineCount();

    socket.on(
      "matchmaking:join",
      async (payload?: {
        playerName?: string;
        rulesetId?: "folk" | "international";
        mode?: "folk" | "international" | "blitz";
        timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number };
        authToken?: string;
      }) => {
        const authUser = await requireVerifiedUser(socket, payload?.authToken, "matchmaking");
        if (!authUser) return;

        const name = authUser.displayName || payload?.playerName?.trim() || "Player";
        const authMeta = authMetaFromUser(authUser);

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
          roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

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

    socket.on(
      "create:private",
      async (payload?: {
        playerName?: string;
        rulesetId?: "folk" | "international";
        mode?: "folk" | "international" | "blitz";
        timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds?: number };
        authToken?: string;
      }) => {
        const authUser = await requireVerifiedUser(socket, payload?.authToken, "room");
        if (!authUser) return;

        const name = authUser.displayName || payload?.playerName?.trim() || "Host";
        const authMeta = authMetaFromUser(authUser);

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
        if (!pin) {
          socket.emit("room:error", {
            code: "INVALID_PIN",
            message: "Vui lòng nhập mã phòng.",
          });
          return;
        }

        const authUser = await requireVerifiedUser(socket, payload?.authToken, "room");
        if (!authUser) return;

        const name = authUser.displayName || payload?.playerName?.trim() || "Guest";
        const authMeta = authMetaFromUser(authUser);
        const result = roomManager.joinPrivateRoom(pin, socket.id, name, authMeta);

        if (!result.success) {
          socket.emit("room:error", { code: result.code, message: result.message });
          return;
        }

        const room = result.room;
        socket.join(room.id);

        const hostSocket = io.sockets.sockets.get(room.players.w!.socketId);
        const guestSocket = socket;
        const game = room.gameState!;
        roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

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

    socket.on("game:move", (payload: { from: number; to: number }) => {
      const moveResult = roomManager.handleMove(socket.id, payload?.from, payload?.to);

      if (!moveResult.success) {
        socket.emit("game:error", moveResult.error);
        if (moveResult.timeout) {
          const room = roomManager.getRoomBySocket(socket.id);
          if (room) {
            const playerColor = roomManager.getPlayerColor(room, socket.id);
            const winner = playerColor === "w" ? "b" : "w";
            persistRankedResult(room, winner, "timeout");
            io.to(room.id).emit("game:over", {
              winner,
              reason: "timeout",
              result: { winner, reason: "timeout", timedOutPlayer: playerColor },
            });
          }
        }
        return;
      }

      io.to(moveResult.room.id).emit("game:moved", moveResult.movedPayload);

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
          details: { winner, reason, turn: game.turn },
        });

        persistRankedResult(moveResult.room, winner as "w" | "b" | "draw", reason);
        io.to(moveResult.room.id).emit("game:over", {
          winner,
          reason,
          result: game.result,
        });
      } else {
        roomManager.startTurnTimer(moveResult.room, onRoomTimeout, onTurnSkipped);

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
          details: { winner: resignResult.winnerColor, reason: "resignation" },
        });

        persistRankedResult(resignResult.room, resignResult.winnerColor, "resignation");
        io.to(resignResult.room.id).emit("game:over", {
          winner: resignResult.winnerColor,
          reason: "resignation",
          result: { winner: resignResult.winnerColor, reason: "resignation" },
        });
      }
    });

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
        persistRankedResult(result.room, "draw", "draw_agreement");
        io.to(result.room.id).emit("game:over", {
          winner: "draw",
          reason: "draw_agreement",
          result: { winner: "draw", reason: "draw_agreement" },
        });
      } else {
        socket.emit("game:error", { code: "DRAW_ERROR", message: result.error });
      }
    });

    socket.on("game:draw_decline", () => {
      const result = roomManager.handleDrawDecline(socket.id);
      if (result.success) io.to(result.opponentSocketId).emit("game:draw_declined");
    });

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
      if (result.success) io.to(result.opponentSocketId).emit("game:rematch_declined");
    });

    socket.on(
      "game:reconnect",
      (payload?: { roomId?: string; sessionToken?: string; color?: string }) => {
        const roomId = payload?.roomId;
        const sessionToken = payload?.sessionToken;

        if (!roomId) {
          socket.emit("game:error", {
            code: "RECONNECT_FAILED",
            message: "Mã phòng không hợp lệ.",
          });
          return;
        }

        if (!sessionToken) {
          socket.emit("game:error", {
            code: "RECONNECT_FAILED",
            message: "Phiên trận đấu không hợp lệ. Vui lòng quay lại sảnh.",
          });
          return;
        }

        const result = roomManager.handleReconnect(socket.id, roomId, sessionToken);

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
          if (staleSocket) staleSocket.leave(room.id);
        }
        socket.join(room.id);
        const game = room.gameState!;

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

        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("player:status", {
            color: player.color,
            connected: true,
            message: "Đối thủ đã kết nối lại.",
          });
        }
      },
    );

    socket.on("chat:send", (payload?: { message?: string; text?: string }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;

      const rawText =
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.text === "string"
            ? payload.text
            : "";
      const cleanText = rawText.trim();
      if (!cleanText || cleanText.length > 200) return;

      const senderColor = roomManager.getPlayerColor(room, socket.id);
      let senderName = "Player";
      if (senderColor === "w" && room.players.w) senderName = room.players.w.name;
      else if (senderColor === "b" && room.players.b) senderName = room.players.b.name;

      io.to(room.id).emit("chat:message", {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        senderId: socket.id,
        senderName,
        senderColor,
        text: cleanText,
        timestamp: Date.now(),
      });
    });

    socket.on("game:leave", () => {
      matchmakingManager.leaveQueue(socket.id);
      const leaveResult = roomManager.handleManualLeave(socket.id);
      if (leaveResult && leaveResult.type === "playing_game_over") {
        persistRankedResult(leaveResult.room, leaveResult.winnerColor, "player_left");
        io.to(leaveResult.opponentSocketId).emit("game:over", {
          winner: leaveResult.winnerColor,
          reason: "player_left",
          result: { winner: leaveResult.winnerColor, reason: "player_left" },
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

    socket.on("disconnect", () => {
      broadcastOnlineCount();
      aiBotManager.cancelFallback(socket.id);
      matchmakingManager.leaveQueue(socket.id);
      const dcResult = roomManager.handleDisconnect(socket.id);
      if (dcResult && dcResult.type === "player_disconnected") {
        io.to(dcResult.opponentSocketId).emit("player:status", {
          color: dcResult.disconnectedColor,
          connected: false,
          message: "Đối thủ tạm thời mất kết nối...",
        });
      }
    });
  });
}

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

export function createRealtimeServer(options: RealtimeServerOptions = {}) {
  const port = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
  const corsOrigin = options.corsOrigin ?? "*";

  let ioRef: SocketIOServer | null = null;

  const httpServer = http.createServer((req, res) => {
    if (req.url === "/api/online-count") {
      const realCount = ioRef?.sockets?.sockets?.size || 0;
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ realCount, onlineCount: realCount + 50 }));
      return;
    }

    if (req.url === "/health" || req.url === "/") {
      const realCount = ioRef?.sockets?.sockets?.size || 0;
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          status: "healthy",
          server: "ouk-chatrang-authoritative",
          uptime: process.uptime(),
          timestamp: Date.now(),
          onlineCount: realCount + 50,
          realCount,
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

  ioRef = io;
  registerSocketHandlers(io);

  return {
    httpServer,
    io,
    start: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.listen(port, "0.0.0.0", () => resolve());
        httpServer.on("error", reject);
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        io.close(() => resolve());
      }),
  };
}
