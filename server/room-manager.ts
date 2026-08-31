import crypto from "crypto";
import { Color } from "../src/lib/khmer-chess";
import { createInitialGameState, getAfkWindowMs, validateAndExecuteMove } from "./game-engine";
import { GameErrorPayload, GameMovedPayload, GameState } from "./game-types";
import { MatchmakingPlayer, PlayerInfo, Room } from "./room-types";
import { serverLogger } from "./logger";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private pinToRoomId: Map<string, string> = new Map();
  private socketToRoomId: Map<string, string> = new Map();

  /**
   * Generates a secure, readable 6-digit numeric PIN.
   */
  private generateUniquePin(): string {
    for (let attempts = 0; attempts < 100; attempts++) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      if (!this.pinToRoomId.has(pin)) {
        return pin;
      }
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Creates a room for matched players from matchmaking.
   */
  public createMatchmakingRoom(
    p1: MatchmakingPlayer,
    p2: MatchmakingPlayer,
    rulesetId: "folk" | "international" = "folk",
    timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds: number },
  ): Room {
    const roomId = `match_${crypto.randomUUID()}`;
    const gameState = createInitialGameState(rulesetId, timeControl);

    const playerW: PlayerInfo = {
      socketId: p1.socketId,
      sessionToken: `st_${crypto.randomUUID()}`,
      uid: p1.uid,
      name: p1.name || "Player 1",
      photoURL: p1.photoURL,
      color: "w",
      joinedAt: p1.joinedAt,
      connected: true,
      disconnectedAt: null,
    };

    const playerB: PlayerInfo = {
      socketId: p2.socketId,
      sessionToken: `st_${crypto.randomUUID()}`,
      uid: p2.uid,
      name: p2.name || "Player 2",
      photoURL: p2.photoURL,
      color: "b",
      joinedAt: p2.joinedAt,
      connected: true,
      disconnectedAt: null,
    };

    const room: Room = {
      id: roomId,
      type: "random",
      status: "playing",
      rulesetId,
      timeControl: gameState.timeControl,
      players: {
        w: playerW,
        b: playerB,
      },
      gameState,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.socketToRoomId.set(p1.socketId, roomId);
    this.socketToRoomId.set(p2.socketId, roomId);

    serverLogger.info("ROOM_CREATE", {
      roomId,
      details: {
        type: "random",
        rulesetId,
        timeControl,
        playerW: playerW.name,
        playerB: playerB.name,
      },
    });

    return room;
  }

  /**
   * Creates a private room with a 6-digit PIN.
   */
  public createPrivateRoom(
    socketId: string,
    name: string = "Host",
    rulesetId: "folk" | "international" = "folk",
    timeControl?: { type: "standard" | "blitz" | "custom"; initialSeconds: number },
    authMeta?: { uid?: string; photoURL?: string | null; emailVerified?: boolean },
  ): Room {
    // If socket was in another room, clean it up first
    this.removeSocket(socketId);

    const roomId = `room_${crypto.randomUUID()}`;
    const pin = this.generateUniquePin();

    const playerW: PlayerInfo = {
      socketId,
      sessionToken: `st_${crypto.randomUUID()}`,
      uid: authMeta?.uid,
      name: name.trim() || "Host",
      photoURL: authMeta?.photoURL,
      emailVerified: authMeta?.emailVerified,
      color: "w",
      joinedAt: Date.now(),
      connected: true,
      disconnectedAt: null,
    };

    const room: Room = {
      id: roomId,
      type: "private",
      pin,
      status: "waiting",
      rulesetId,
      timeControl,
      players: {
        w: playerW,
        b: null,
      },
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.pinToRoomId.set(pin, roomId);
    this.socketToRoomId.set(socketId, roomId);

    serverLogger.info("ROOM_CREATE", {
      roomId,
      socketId,
      color: "w",
      playerName: playerW.name,
      details: {
        type: "private",
        pin,
        rulesetId,
        timeControl,
        uid: playerW.uid,
      },
    });

    return room;
  }

  /**
   * Joins an existing private room using a 6-digit PIN.
   */
  public joinPrivateRoom(
    pin: string,
    socketId: string,
    name: string = "Guest",
    authMeta?: { uid?: string; photoURL?: string | null; emailVerified?: boolean },
  ):
    | { success: true; room: Room }
    | {
        success: false;
        code: "ROOM_NOT_FOUND" | "ROOM_FULL" | "INVALID_PIN" | "ALREADY_IN_ROOM";
        message: string;
      } {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      serverLogger.warn("ROOM_JOIN", {
        socketId,
        details: { pin: cleanPin, code: "INVALID_PIN", message: "Mã phòng không hợp lệ" },
      });
      return {
        success: false,
        code: "INVALID_PIN",
        message: "Mã phòng phải gồm 6 chữ số hợp lệ.",
      };
    }

    const roomId = this.pinToRoomId.get(cleanPin);
    if (!roomId) {
      serverLogger.warn("ROOM_JOIN", {
        socketId,
        details: { pin: cleanPin, code: "ROOM_NOT_FOUND", message: "Phòng không tồn tại" },
      });
      return {
        success: false,
        code: "ROOM_NOT_FOUND",
        message: "Không tìm thấy phòng với mã này hoặc phòng đã đóng.",
      };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.pinToRoomId.delete(cleanPin);
      serverLogger.warn("ROOM_JOIN", {
        socketId,
        details: { pin: cleanPin, code: "ROOM_NOT_FOUND", message: "Phòng không tồn tại" },
      });
      return {
        success: false,
        code: "ROOM_NOT_FOUND",
        message: "Không tìm thấy phòng với mã này.",
      };
    }

    if (room.status !== "waiting" || room.players.b !== null) {
      serverLogger.warn("ROOM_JOIN", {
        roomId: room.id,
        socketId,
        details: { pin: cleanPin, code: "ROOM_FULL", message: "Phòng đã đủ người" },
      });
      return {
        success: false,
        code: "ROOM_FULL",
        message: "Phòng này đã đủ người chơi.",
      };
    }

    if (room.players.w?.socketId === socketId) {
      serverLogger.warn("ROOM_JOIN", {
        roomId: room.id,
        socketId,
        details: { pin: cleanPin, code: "ALREADY_IN_ROOM", message: "Đã ở trong phòng" },
      });
      return {
        success: false,
        code: "ALREADY_IN_ROOM",
        message: "Bạn đã ở trong phòng này.",
      };
    }

    // Clean any prior room for this socket
    this.removeSocket(socketId);

    const playerB: PlayerInfo = {
      socketId,
      sessionToken: `st_${crypto.randomUUID()}`,
      uid: authMeta?.uid,
      name: name.trim() || "Guest",
      photoURL: authMeta?.photoURL,
      emailVerified: authMeta?.emailVerified,
      color: "b",
      joinedAt: Date.now(),
      connected: true,
      disconnectedAt: null,
    };

    room.players.b = playerB;
    room.status = "playing";
    room.gameState = createInitialGameState(room.rulesetId || "folk", room.timeControl);

    this.socketToRoomId.set(socketId, roomId);

    serverLogger.info("ROOM_JOIN", {
      roomId: room.id,
      socketId,
      color: "b",
      playerName: playerB.name,
      details: { pin: cleanPin, hostName: room.players.w?.name },
    });

    return {
      success: true,
      room,
    };
  }

  /**
   * Starts authoritative turn timer for a room.
   */
  public startTurnTimer(
    room: Room,
    onTimeout: (
      room: Room,
      winnerColor: Color,
      timedOutColor: Color,
      reason?: "timeout" | "afk_timeout",
    ) => void,
    onTurnSkipped?: (
      room: Room,
      skippedColor: Color,
      nextTurn: Color,
      afkStrikes: { w: number; b: number },
    ) => void,
  ): void {
    this.clearRoomTimer(room);

    if (room.status !== "playing" || !room.gameState) {
      return;
    }

    const currentTurn = room.gameState.turn;
    const matchClockRemaining = Math.max(10, room.gameState.clocks[currentTurn]);

    let targetDurationMs = matchClockRemaining;
    let isAfkTimeout = false;
    let isAfkSkip = false;

    if (room.gameState.afkEnabled) {
      const strikes = room.gameState.afkStrikes?.[currentTurn] || 0;
      const afkWindowMs = getAfkWindowMs(strikes);
      if (afkWindowMs < matchClockRemaining) {
        targetDurationMs = afkWindowMs;
        if (strikes >= 2) {
          isAfkTimeout = true;
        } else {
          isAfkSkip = true;
        }
      }
    }

    room.timerHandle = setTimeout(() => {
      if (room.status !== "playing" || !room.gameState) {
        return;
      }

      if (isAfkSkip) {
        const currentStrikes = room.gameState.afkStrikes?.[currentTurn] || 0;
        room.gameState.afkStrikes[currentTurn] = currentStrikes + 1;
        room.gameState.clocks[currentTurn] = Math.max(
          0,
          room.gameState.clocks[currentTurn] - targetDurationMs,
        );

        const skippedColor = currentTurn;
        const nextTurn: Color = currentTurn === "w" ? "b" : "w";
        room.gameState.turn = nextTurn;
        room.gameState.lastTurnTimestamp = Date.now();

        this.clearRoomTimer(room);
        serverLogger.info("AFK_STRIKE", {
          roomId: room.id,
          color: skippedColor,
          details: {
            skippedColor,
            nextTurn,
            strikes: room.gameState.afkStrikes,
          },
        });
        if (onTurnSkipped) {
          onTurnSkipped(room, skippedColor, nextTurn, room.gameState.afkStrikes);
        }
        this.startTurnTimer(room, onTimeout, onTurnSkipped);
      } else {
        room.gameState.clocks[currentTurn] = Math.max(
          0,
          room.gameState.clocks[currentTurn] - targetDurationMs,
        );
        const winnerColor: Color = currentTurn === "w" ? "b" : "w";
        room.gameState.status = "timeout";
        room.status = "finished";
        this.clearRoomTimer(room);

        serverLogger.info("TIMEOUT", {
          roomId: room.id,
          color: currentTurn,
          details: {
            winner: winnerColor,
            timedOutPlayer: currentTurn,
            isAfkTimeout,
          },
        });

        onTimeout(room, winnerColor, currentTurn, isAfkTimeout ? "afk_timeout" : "timeout");
      }
    }, targetDurationMs);
  }

  /**
   * Clears any active turn timer for a room.
   */
  public clearRoomTimer(room: Room): void {
    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }
  }

  public getRoomBySocket(socketId: string): Room | undefined {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  public getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getPlayerColor(room: Room, socketId: string): Color | null {
    if (room.players.w?.socketId === socketId) return "w";
    if (room.players.b?.socketId === socketId) return "b";
    return null;
  }

  public getOpponent(room: Room, socketId: string): PlayerInfo | null {
    if (room.players.w?.socketId === socketId) return room.players.b;
    if (room.players.b?.socketId === socketId) return room.players.w;
    return null;
  }

  /**
   * Executes a move on the authoritative game state.
   */
  public handleMove(
    socketId: string,
    rawFrom: unknown,
    rawTo: unknown,
  ):
    | {
        success: true;
        room: Room;
        movedPayload: GameMovedPayload;
      }
    | {
        success: false;
        error: GameErrorPayload;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || !room.gameState) {
      serverLogger.warn("MOVE_REJECTED", {
        socketId,
        details: {
          from: rawFrom,
          to: rawTo,
          code: "NOT_IN_ROOM",
          message: "Chưa ở trong trận đấu",
        },
      });
      return {
        success: false,
        error: {
          code: "NOT_IN_ROOM",
          message: "Bạn chưa ở trong trận đấu đang diễn ra.",
        },
      };
    }

    if (room.status !== "playing") {
      serverLogger.warn("MOVE_REJECTED", {
        roomId: room.id,
        socketId,
        details: {
          from: rawFrom,
          to: rawTo,
          code: "GAME_ALREADY_FINISHED",
          message: "Trận đấu đã kết thúc",
        },
      });
      return {
        success: false,
        error: {
          code: "GAME_ALREADY_FINISHED",
          message: "Trận đấu đã kết thúc.",
        },
      };
    }

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) {
      serverLogger.warn("MOVE_REJECTED", {
        roomId: room.id,
        socketId,
        details: {
          from: rawFrom,
          to: rawTo,
          code: "NOT_IN_ROOM",
          message: "Không xác định vị trí người chơi",
        },
      });
      return {
        success: false,
        error: {
          code: "NOT_IN_ROOM",
          message: "Không xác định được vị trí người chơi.",
        },
      };
    }

    const moveResult = validateAndExecuteMove({
      gameState: room.gameState,
      playerColor,
      rawFrom,
      rawTo,
    });

    if (!moveResult.success) {
      serverLogger.warn("MOVE_REJECTED", {
        roomId: room.id,
        socketId,
        color: playerColor,
        details: {
          from: rawFrom,
          to: rawTo,
          code: moveResult.error.code,
          message: moveResult.error.message,
          turn: room.gameState.turn,
        },
      });

      if (moveResult.timeout) {
        room.status = "finished";
        this.clearRoomTimer(room);
      }
      return moveResult;
    }

    serverLogger.info("MOVE_ACCEPTED", {
      roomId: room.id,
      socketId,
      color: playerColor,
      details: {
        from: rawFrom,
        to: rawTo,
        turn: room.gameState.turn,
        moveCount: room.gameState.moveHistory.length,
        isCheck: room.gameState.isCheck,
        status: room.gameState.status,
      },
    });

    if (
      room.gameState.result !== null ||
      room.gameState.status === "checkmate" ||
      room.gameState.status === "stalemate" ||
      room.gameState.status === "timeout" ||
      room.gameState.status === "king_captured"
    ) {
      room.status = "finished";
      this.clearRoomTimer(room);
    }

    return {
      success: true,
      room,
      movedPayload: {
        roomId: room.id,
        ...moveResult.movedPayload,
      },
    };
  }

  /**
   * Handles player resignation.
   */
  public handleResign(socketId: string):
    | {
        success: true;
        room: Room;
        winnerColor: Color;
        resignedColor: Color;
        opponentSocketId: string;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || !room.gameState || room.status !== "playing") {
      return { success: false, error: "Không tìm thấy trận đấu đang chơi." };
    }

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) {
      return { success: false, error: "Không xác định được người chơi." };
    }

    const opponent = this.getOpponent(room, socketId);
    if (!opponent) {
      return { success: false, error: "Không tìm thấy đối thủ." };
    }

    const winnerColor: Color = playerColor === "w" ? "b" : "w";
    room.status = "finished";
    this.clearRoomTimer(room);

    serverLogger.info("RESIGN", {
      roomId: room.id,
      socketId,
      color: playerColor,
      details: {
        winner: winnerColor,
        resignedPlayer: playerColor,
      },
    });

    return {
      success: true,
      room,
      winnerColor,
      resignedColor: playerColor,
      opponentSocketId: opponent.socketId,
    };
  }

  /**
   * Handles draw offer.
   */
  public handleDrawOffer(socketId: string):
    | {
        success: true;
        room: Room;
        offererColor: Color;
        opponentSocketId: string;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || !room.gameState || room.status !== "playing") {
      return { success: false, error: "Không tìm thấy trận đấu đang chơi." };
    }

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) {
      return { success: false, error: "Không xác định được người chơi." };
    }

    const opponent = this.getOpponent(room, socketId);
    if (!opponent) {
      return { success: false, error: "Không tìm thấy đối thủ." };
    }

    room.drawOfferedBy = playerColor;

    serverLogger.info("DRAW_OFFER", {
      roomId: room.id,
      socketId,
      color: playerColor,
      details: {
        offerer: playerColor,
      },
    });

    return {
      success: true,
      room,
      offererColor: playerColor,
      opponentSocketId: opponent.socketId,
    };
  }

  /**
   * Handles draw accept.
   */
  public handleDrawAccept(socketId: string):
    | {
        success: true;
        room: Room;
        acceptedColor: Color;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || !room.gameState || room.status !== "playing") {
      return { success: false, error: "Không tìm thấy trận đấu đang chơi." };
    }

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) {
      return { success: false, error: "Không xác định được người chơi." };
    }

    if (!room.drawOfferedBy || room.drawOfferedBy === playerColor) {
      return { success: false, error: "Không có lời cầu hòa hợp lệ từ đối thủ." };
    }

    room.status = "finished";
    this.clearRoomTimer(room);
    room.drawOfferedBy = null;

    room.gameState.status = "draw";
    room.gameState.winner = "draw";
    room.gameState.reason = "draw_agreement";
    room.gameState.result = {
      winner: "draw",
      reason: "draw_agreement",
    };

    serverLogger.info("DRAW_ACCEPT", {
      roomId: room.id,
      socketId,
      color: playerColor,
      details: {
        acceptedBy: playerColor,
        reason: "draw_agreement",
      },
    });

    return {
      success: true,
      room,
      acceptedColor: playerColor,
    };
  }

  /**
   * Handles draw decline.
   */
  public handleDrawDecline(socketId: string):
    | {
        success: true;
        room: Room;
        opponentSocketId: string;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.status !== "playing") {
      return { success: false, error: "Không tìm thấy trận đấu." };
    }

    const opponent = this.getOpponent(room, socketId);
    room.drawOfferedBy = null;

    if (!opponent) {
      return { success: false, error: "Không tìm thấy đối thủ." };
    }

    serverLogger.info("DRAW_DECLINE", {
      roomId: room.id,
      socketId,
      details: {
        declinedBy: this.getPlayerColor(room, socketId),
      },
    });

    return {
      success: true,
      room,
      opponentSocketId: opponent.socketId,
    };
  }

  /**
   * Handles rematch request.
   */
  public handleRematchRequest(
    socketId: string,
    onTimeout: (
      room: Room,
      winnerColor: Color,
      timedOutColor: Color,
      reason?: "timeout" | "afk_timeout",
    ) => void,
    onTurnSkipped?: (
      room: Room,
      skippedColor: Color,
      nextTurn: Color,
      afkStrikes: { w: number; b: number },
    ) => void,
  ):
    | {
        type: "rematch_started";
        room: Room;
        playerW: PlayerInfo;
        playerB: PlayerInfo;
      }
    | {
        type: "rematch_offered";
        room: Room;
        fromColor: Color;
        opponentSocketId: string;
      }
    | {
        type: "error";
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.status !== "finished") {
      return { type: "error", error: "Không thể yêu cầu đấu lại khi trận chưa kết thúc." };
    }

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) {
      return { type: "error", error: "Không xác định được người chơi." };
    }

    const opponent = this.getOpponent(room, socketId);
    if (!opponent) {
      return { type: "error", error: "Đối thủ đã rời phòng." };
    }

    if (!room.rematchRequestedBy) {
      room.rematchRequestedBy = new Set();
    }
    room.rematchRequestedBy.add(playerColor);

    // If both players requested rematch, start fresh game with swapped colors
    if (room.rematchRequestedBy.size >= 2) {
      this.clearRoomTimer(room);
      room.rematchRequestedBy.clear();
      room.drawOfferedBy = null;

      // Swap colors for fairness
      const prevW = room.players.w;
      const prevB = room.players.b;

      if (!prevW || !prevB) {
        return { type: "error", error: "Thiếu thông tin người chơi." };
      }

      const newPlayerW: PlayerInfo = {
        ...prevB,
        color: "w",
      };
      const newPlayerB: PlayerInfo = {
        ...prevW,
        color: "b",
      };

      const freshGameState = createInitialGameState(room.rulesetId, room.timeControl);

      room.status = "playing";
      room.gameState = freshGameState;
      room.players = {
        w: newPlayerW,
        b: newPlayerB,
      };

      // Restart authoritative clock timer
      this.startTurnTimer(room, onTimeout, onTurnSkipped);

      serverLogger.info("REMATCH_START", {
        roomId: room.id,
        details: {
          swappedWhite: newPlayerW.name,
          swappedBlack: newPlayerB.name,
          rulesetId: room.rulesetId,
        },
      });

      return {
        type: "rematch_started",
        room,
        playerW: newPlayerW,
        playerB: newPlayerB,
      };
    }

    serverLogger.info("REMATCH_OFFER", {
      roomId: room.id,
      socketId,
      color: playerColor,
      details: {
        offeredBy: playerColor,
      },
    });

    return {
      type: "rematch_offered",
      room,
      fromColor: playerColor,
      opponentSocketId: opponent.socketId,
    };
  }

  /**
   * Handles rematch decline.
   */
  public handleRematchDecline(socketId: string):
    | {
        success: true;
        room: Room;
        opponentSocketId: string;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.getRoomBySocket(socketId);
    if (!room) {
      return { success: false, error: "Không tìm thấy phòng." };
    }

    if (room.rematchRequestedBy) {
      room.rematchRequestedBy.clear();
    }

    const opponent = this.getOpponent(room, socketId);
    if (!opponent) {
      return { success: false, error: "Không tìm thấy đối thủ." };
    }

    serverLogger.info("REMATCH_DECLINE", {
      roomId: room.id,
      socketId,
      details: {
        declinedBy: this.getPlayerColor(room, socketId),
      },
    });

    return {
      success: true,
      room,
      opponentSocketId: opponent.socketId,
    };
  }

  /**
   * Handles unexpected socket disconnection (device sleep, network drop, tab switch).
   * Does NOT instantly forfeit an active match. Clocks & AFK timers continue running.
   */
  public handleDisconnect(socketId: string):
    | {
        type: "waiting_room_closed";
        roomId: string;
      }
    | {
        type: "player_disconnected";
        room: Room;
        disconnectedColor: Color;
        opponentSocketId: string;
      }
    | null {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;

    this.socketToRoomId.delete(socketId);

    // If room is in waiting state (private room waiting for guest)
    if (room.status === "waiting") {
      this.clearRoomTimer(room);
      if (room.pin) {
        this.pinToRoomId.delete(room.pin);
      }
      this.rooms.delete(room.id);

      serverLogger.info("DISCONNECT", {
        roomId: room.id,
        socketId,
        details: { type: "waiting_room_closed" },
      });

      return {
        type: "waiting_room_closed",
        roomId: room.id,
      };
    }

    // If room is actively playing, keep match alive and mark player disconnected
    if (room.status === "playing") {
      const playerColor = this.getPlayerColor(room, socketId);
      const opponent = this.getOpponent(room, socketId);

      if (playerColor) {
        const player = room.players[playerColor];
        if (player) {
          player.connected = false;
          player.disconnectedAt = Date.now();
        }
      }

      serverLogger.info("DISCONNECT", {
        roomId: room.id,
        socketId,
        color: playerColor || undefined,
        details: { type: "playing_player_disconnected", matchContinues: true },
      });

      if (opponent && playerColor) {
        return {
          type: "player_disconnected",
          room,
          disconnectedColor: playerColor,
          opponentSocketId: opponent.socketId,
        };
      }
    }

    // If room is finished, mark disconnected and check if all players have left/disconnected
    if (room.status === "finished") {
      const playerColor = this.getPlayerColor(room, socketId);
      const opponent = this.getOpponent(room, socketId);
      if (playerColor && room.players[playerColor]) {
        room.players[playerColor]!.connected = false;
        room.players[playerColor]!.disconnectedAt = Date.now();
      }
      if (room.rematchRequestedBy && playerColor) {
        room.rematchRequestedBy.delete(playerColor);
      }

      const wConnected =
        !!room.players.w?.connected && this.socketToRoomId.get(room.players.w.socketId) === room.id;
      const bConnected =
        !!room.players.b?.connected && this.socketToRoomId.get(room.players.b.socketId) === room.id;

      if (!wConnected && !bConnected) {
        this.clearRoomTimer(room);
        if (room.pin) {
          this.pinToRoomId.delete(room.pin);
        }
        this.rooms.delete(room.id);
      }

      serverLogger.info("DISCONNECT", {
        roomId: room.id,
        socketId,
        color: playerColor || undefined,
        details: { type: "finished_player_disconnected", roomEvicted: !wConnected && !bConnected },
      });

      if (opponent && playerColor) {
        return {
          type: "player_disconnected",
          room,
          disconnectedColor: playerColor,
          opponentSocketId: opponent.socketId,
        };
      }
    }

    return null;
  }

  /**
   * Handles explicit player leave or forfeit (e.g. clicking Leave Match or Resign).
   */
  public handleManualLeave(socketId: string):
    | {
        type: "waiting_room_closed";
        roomId: string;
      }
    | {
        type: "playing_game_over";
        room: Room;
        winnerColor: Color;
        disconnectedColor: Color;
        opponentSocketId: string;
      }
    | {
        type: "finished_player_left";
        opponentSocketId: string;
      }
    | null {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;

    this.socketToRoomId.delete(socketId);

    if (room.status === "waiting") {
      this.clearRoomTimer(room);
      if (room.pin) {
        this.pinToRoomId.delete(room.pin);
      }
      this.rooms.delete(room.id);

      serverLogger.info("PLAYER_LEFT", {
        roomId: room.id,
        socketId,
        details: { type: "waiting_room_closed" },
      });

      return {
        type: "waiting_room_closed",
        roomId: room.id,
      };
    }

    if (room.status === "playing") {
      this.clearRoomTimer(room);
      const playerColor = this.getPlayerColor(room, socketId);
      const opponent = this.getOpponent(room, socketId);

      room.status = "finished";
      if (playerColor && room.players[playerColor]) {
        room.players[playerColor]!.connected = false;
        room.players[playerColor]!.disconnectedAt = Date.now();
      }

      serverLogger.info("PLAYER_LEFT", {
        roomId: room.id,
        socketId,
        color: playerColor || undefined,
        details: { type: "playing_game_over" },
      });

      if (opponent && playerColor) {
        const winnerColor: Color = playerColor === "w" ? "b" : "w";
        return {
          type: "playing_game_over",
          room,
          winnerColor,
          disconnectedColor: playerColor,
          opponentSocketId: opponent.socketId,
        };
      }
    }

    if (room.status === "finished") {
      const playerColor = this.getPlayerColor(room, socketId);
      const opponent = this.getOpponent(room, socketId);
      if (playerColor && room.players[playerColor]) {
        room.players[playerColor]!.connected = false;
        room.players[playerColor]!.disconnectedAt = Date.now();
      }
      if (room.rematchRequestedBy && playerColor) {
        room.rematchRequestedBy.delete(playerColor);
      }

      const wConnected =
        !!room.players.w?.connected && this.socketToRoomId.get(room.players.w.socketId) === room.id;
      const bConnected =
        !!room.players.b?.connected && this.socketToRoomId.get(room.players.b.socketId) === room.id;

      if (!wConnected && !bConnected) {
        this.clearRoomTimer(room);
        if (room.pin) {
          this.pinToRoomId.delete(room.pin);
        }
        this.rooms.delete(room.id);
      }

      serverLogger.info("PLAYER_LEFT", {
        roomId: room.id,
        socketId,
        color: playerColor || undefined,
        details: { type: "finished_player_left" },
      });

      if (opponent && opponent.connected) {
        return {
          type: "finished_player_left",
          opponentSocketId: opponent.socketId,
        };
      }
    }

    return null;
  }

  /**
   * Reconnects a returning player (after phone unlock, app resume, network reconnect).
   */
  public handleReconnect(
    newSocketId: string,
    roomId: string,
    sessionToken?: string,
    color?: string,
  ):
    | {
        success: true;
        room: Room;
        player: PlayerInfo;
        opponent: PlayerInfo | null;
        staleSocketId?: string;
      }
    | {
        success: false;
        error: string;
      } {
    const room = this.rooms.get(roomId);
    if (!room) {
      serverLogger.warn("RECONNECT", {
        roomId,
        socketId: newSocketId,
        details: { error: "ROOM_NOT_FOUND" },
      });
      return { success: false, error: "Phòng chơi không tồn tại hoặc đã kết thúc." };
    }

    if (room.status !== "playing") {
      serverLogger.warn("RECONNECT", {
        roomId,
        socketId: newSocketId,
        details: { error: "ROOM_NOT_PLAYING", status: room.status },
      });
      return { success: false, error: "Trận đấu không còn ở trạng thái đang diễn ra." };
    }

    let targetPlayer: PlayerInfo | null = null;
    let opponent: PlayerInfo | null = null;

    if (sessionToken) {
      if (room.players.w?.sessionToken === sessionToken) {
        targetPlayer = room.players.w;
        opponent = room.players.b;
      } else if (room.players.b?.sessionToken === sessionToken) {
        targetPlayer = room.players.b;
        opponent = room.players.w;
      } else {
        // If an invalid sessionToken was explicitly supplied, reject reconnection
        serverLogger.warn("RECONNECT", {
          roomId,
          socketId: newSocketId,
          details: { error: "INVALID_SESSION_TOKEN" },
        });
        return { success: false, error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." };
      }
    } else if (color === "w" || color === "b") {
      targetPlayer = room.players[color];
      opponent = color === "w" ? room.players.b : room.players.w;
    }

    if (!targetPlayer) {
      serverLogger.warn("RECONNECT", {
        roomId,
        socketId: newSocketId,
        details: { error: "INVALID_SESSION_INFO" },
      });
      return { success: false, error: "Không tìm thấy thông tin phiên người chơi." };
    }

    // Clean up any stale socket mapping
    const staleSocketId =
      targetPlayer.socketId && targetPlayer.socketId !== newSocketId
        ? targetPlayer.socketId
        : undefined;

    if (staleSocketId) {
      this.socketToRoomId.delete(staleSocketId);
    }

    // Reattach new socket
    targetPlayer.socketId = newSocketId;
    targetPlayer.connected = true;
    targetPlayer.disconnectedAt = null;

    this.socketToRoomId.set(newSocketId, roomId);

    serverLogger.info("RECONNECT", {
      roomId: room.id,
      socketId: newSocketId,
      color: targetPlayer.color,
      playerName: targetPlayer.name,
      details: {
        staleSocketId,
        turn: room.gameState?.turn,
      },
    });

    return {
      success: true,
      room,
      player: targetPlayer,
      opponent,
      staleSocketId,
    };
  }

  /**
   * Removes a socket from any room mapping.
   */
  public removeSocket(socketId: string): void {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return;

    this.socketToRoomId.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.status === "waiting") {
      this.clearRoomTimer(room);
      if (room.pin) this.pinToRoomId.delete(room.pin);
      this.rooms.delete(roomId);
    }
  }

  /**
   * Cleans up stale finished or abandoned waiting rooms.
   * CRITICAL SAFETY RULE: NEVER cleans up active playing rooms with connected players!
   */
  public cleanupStaleRooms(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [roomId, room] of this.rooms.entries()) {
      const isOld = now - room.createdAt > maxAgeMs;
      const isWaiting = room.status === "waiting";
      const isFinished = room.status === "finished";
      const bothDisconnected =
        (!room.players.w || !room.players.w.connected) &&
        (!room.players.b || !room.players.b.connected);

      // CRITICAL SAFETY RULES:
      // 1. PLAYING rooms MUST NEVER be cleaned up just because of age! (Active matches can last 60m+ or longer).
      // 2. WAITING rooms older than maxAgeMs (abandoned) are cleaned up.
      // 3. FINISHED rooms are cleaned up if both disconnected OR if older than maxAgeMs.
      const shouldClean = (isWaiting && isOld) || (isFinished && (bothDisconnected || isOld));

      if (shouldClean) {
        this.clearRoomTimer(room);
        if (room.pin) {
          this.pinToRoomId.delete(room.pin);
        }
        if (room.players.w?.socketId) {
          this.socketToRoomId.delete(room.players.w.socketId);
        }
        if (room.players.b?.socketId) {
          this.socketToRoomId.delete(room.players.b.socketId);
        }
        this.rooms.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      serverLogger.info("ROOM_CLEANUP", {
        details: {
          cleanedRooms: cleaned,
          remainingRooms: this.rooms.size,
          activePins: this.pinToRoomId.size,
        },
      });
    }

    return cleaned;
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public getActivePinCount(): number {
    return this.pinToRoomId.size;
  }

  public getSocketMappingCount(): number {
    return this.socketToRoomId.size;
  }

  public clear(): void {
    for (const room of this.rooms.values()) {
      this.clearRoomTimer(room);
    }
    this.rooms.clear();
    this.pinToRoomId.clear();
    this.socketToRoomId.clear();
  }
}

export const roomManager = new RoomManager();
