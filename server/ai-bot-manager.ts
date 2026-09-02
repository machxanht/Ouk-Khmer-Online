import crypto from "crypto";
import { Server as SocketIOServer, Socket } from "socket.io";
import {
  bestMove,
  getRuleSet,
  status as getGameStatus,
  type Color,
  type OukRuleSet,
} from "../src/lib/khmer-chess";
import { MatchmakingPlayer, PlayerColor, Room } from "./room-types";
import { roomManager } from "./room-manager";
import { matchmakingManager } from "./matchmaking-manager";
import { serverLogger } from "./logger";
import { createInitialGameState } from "./game-engine";

const BOT_NAMES = [
  "Sophea Kem",
  "Dara Seng",
  "Kosal Chea",
  "Minh Vu",
  "Thierry Bou",
  "Vibol Prak",
  "Narin Mom",
  "Anouvong Som",
  "Rattanak Phan",
  "Channarith Ouk",
  "Sarith Sam",
  "Phalla Kim",
  "Vannak Meas",
  "Sovanna Tep",
  "Kalyan Roeun",
  "Chanthou Ly",
  "Bona Heng",
  "Rithy Keo",
  "Piseth Neth",
  "Sothea Vong",
  "Veasna Chhay",
  "Somnang Yun",
  "Visal Long",
  "Borey Chan",
  "Mengly Sok",
];

const AI_LEVELS = [2, 3, 4] as const;
type AIFallbackLevel = (typeof AI_LEVELS)[number];

const AI_RATING_RANGES: Record<AIFallbackLevel, readonly [number, number]> = {
  2: [1380, 1519],
  3: [1520, 1669],
  4: [1670, 1819],
};

function randomIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFallbackLevel(): AIFallbackLevel {
  return AI_LEVELS[Math.floor(Math.random() * AI_LEVELS.length)];
}

function getFallbackLevelFromRating(rating?: number): AIFallbackLevel {
  if (!rating || rating < AI_RATING_RANGES[3][0]) return 2;
  if (rating < AI_RATING_RANGES[4][0]) return 3;
  return 4;
}

export class AIBotManager {
  private fallbackTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule AI fallback after a human-looking 10-30 second matchmaking wait.
   * A real opponent always wins the race because matching cancels this timer.
   */
  public scheduleFallback(
    socket: Socket,
    queueData: {
      name: string;
      rulesetId: "folk" | "international";
      mode: "folk" | "international" | "blitz";
      timeControl: { type: "standard" | "blitz" | "custom"; initialSeconds: number };
      authMeta?: { uid?: string; photoURL?: string | null; emailVerified?: boolean };
    },
    io: SocketIOServer,
    onRoomTimeout: (r: Room, winner: string, timedOutPlayer: string, reason: any) => void,
    onTurnSkipped: (r: Room, skippedColor: string, nextTurn: string, afkStrikes: any) => void,
  ) {
    this.cancelFallback(socket.id);

    const delayMs = randomIntInclusive(10_000, 30_000);

    const timer = setTimeout(() => {
      this.fallbackTimers.delete(socket.id);

      // A real player may have matched while this timer was pending.
      if (!matchmakingManager.isInQueue(socket.id)) {
        return;
      }

      matchmakingManager.leaveQueue(socket.id);

      const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const aiLevel = pickFallbackLevel();
      const [ratingMin, ratingMax] = AI_RATING_RANGES[aiLevel];
      const botRating = randomIntInclusive(ratingMin, ratingMax);
      const botSocketId = `bot_${crypto.randomUUID().slice(0, 8)}`;

      const realPlayer: MatchmakingPlayer = {
        socketId: socket.id,
        uid: queueData.authMeta?.uid,
        name: queueData.name,
        photoURL: queueData.authMeta?.photoURL,
        rulesetId: queueData.rulesetId,
        mode: queueData.mode,
        timeControl: queueData.timeControl,
        joinedAt: Date.now(),
        isBot: false,
      };

      // isBot stays server-only. Rating doubles as the persisted internal strength band,
      // so rematches keep the same AI level without exposing bot metadata to the client.
      const botPlayer: MatchmakingPlayer = {
        socketId: botSocketId,
        name: randomName,
        rulesetId: queueData.rulesetId,
        mode: queueData.mode,
        timeControl: queueData.timeControl,
        joinedAt: Date.now(),
        isBot: true,
        rating: botRating,
      };

      const userPlaysWhite = Math.random() > 0.5;
      const p1 = userPlaysWhite ? realPlayer : botPlayer;
      const p2 = userPlaysWhite ? botPlayer : realPlayer;

      const room = roomManager.createMatchmakingRoom(
        p1,
        p2,
        queueData.rulesetId,
        queueData.timeControl,
      );

      socket.join(room.id);

      const game = room.gameState!;
      const userColor: PlayerColor = userPlaysWhite ? "w" : "b";
      const botColor: PlayerColor = userPlaysWhite ? "b" : "w";

      roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

      serverLogger.info("MATCHMAKING_AI_FALLBACK_PAIRED", {
        roomId: room.id,
        socketId: socket.id,
        botName: randomName,
        userColor,
        botColor,
        details: { aiLevel, botRating, fallbackDelayMs: delayMs },
      });

      // Public payload intentionally looks the same as a normal opponent payload.
      socket.emit("game:start", {
        roomId: room.id,
        sessionToken: userColor === "w" ? room.players.w?.sessionToken : room.players.b?.sessionToken,
        color: userColor,
        opponent: {
          name: randomName,
          photoURL: null,
          rating: botRating,
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

      if (botColor === "w") {
        this.triggerBotMove(room, botColor, io, onRoomTimeout, onTurnSkipped);
      }
    }, delayMs);

    this.fallbackTimers.set(socket.id, timer);
  }

  /**
   * Cancel pending fallback timer for a socket.
   */
  public cancelFallback(socketId: string) {
    const timer = this.fallbackTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.fallbackTimers.delete(socketId);
    }
  }

  /**
   * Check if a room is a bot room and it's the bot's turn, then execute move with realistic delay.
   */
  public triggerBotMove(
    room: Room,
    botColor: PlayerColor,
    io: SocketIOServer,
    onRoomTimeout: (r: Room, winner: string, timedOutPlayer: string, reason: any) => void,
    onTurnSkipped: (r: Room, skippedColor: string, nextTurn: string, afkStrikes: any) => void,
  ) {
    if (!room.isBotRoom || room.status !== "playing" || !room.gameState) {
      return;
    }

    if (room.gameState.turn !== botColor) {
      return;
    }

    if (room.botTurnTimer) {
      clearTimeout(room.botTurnTimer);
      room.botTurnTimer = null;
    }

    const botPlayer = botColor === "w" ? room.players.w : room.players.b;
    if (!botPlayer || !botPlayer.isBot) {
      return;
    }

    // Human-like pacing. Blitz stays responsive, while standard games include occasional
    // longer pauses so the opponent never fires back at machine speed.
    const isUnderCheck = Boolean(room.gameState.isCheck);
    const moveCount = room.gameState.moveHistory?.length || 0;
    const isBlitz = room.timeControl?.type === "blitz" || room.timeControl?.initialSeconds === 300;

    let thinkDelay: number;
    if (isUnderCheck) {
      thinkDelay = randomIntInclusive(2_800, 6_200);
    } else if (moveCount < 6) {
      thinkDelay = randomIntInclusive(1_400, 3_200);
    } else {
      thinkDelay = randomIntInclusive(1_900, 5_200);
    }

    if (!isBlitz && Math.random() < 0.12) {
      thinkDelay += randomIntInclusive(800, 2_200);
    } else if (isBlitz) {
      thinkDelay = Math.max(900, Math.round(thinkDelay * 0.65));
    }

    room.botTurnTimer = setTimeout(() => {
      room.botTurnTimer = null;

      if (room.status !== "playing" || !room.gameState || room.gameState.turn !== botColor) {
        return;
      }

      const ruleset: OukRuleSet = getRuleSet(room.rulesetId);
      const aiDepth = getFallbackLevelFromRating(botPlayer.rating);
      const computedMove = bestMove(room.gameState.board, botColor, aiDepth, ruleset);

      if (!computedMove) {
        return;
      }

      const moveResult = roomManager.handleMove(
        botPlayer.socketId,
        computedMove.from,
        computedMove.to,
      );

      if (!moveResult.success) {
        serverLogger.warn("BOT_MOVE_FAILED", {
          roomId: room.id,
          details: moveResult.error,
        });
        return;
      }

      io.to(room.id).emit("game:moved", moveResult.movedPayload);

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
                : "game_end");

        io.to(room.id).emit("game:over", {
          winner,
          reason,
          result: game.result,
        });
      } else {
        roomManager.startTurnTimer(moveResult.room, onRoomTimeout, onTurnSkipped);
      }
    }, thinkDelay);
  }

  /**
   * Handle draw offer when playing against AI bot.
   */
  public handleBotDrawOffer(room: Room, io: SocketIOServer) {
    if (!room.isBotRoom || room.status !== "playing" || !room.gameState) {
      return;
    }

    setTimeout(() => {
      if (room.status !== "playing" || !room.gameState) return;

      const shouldAccept = Math.random() < 0.7;
      if (shouldAccept) {
        room.status = "finished";
        room.gameState.status = "stalemate";
        room.gameState.result = {
          winner: "draw",
          reason: "draw_agreement",
          score: { w: 0.5, b: 0.5 },
        };

        if (room.timerHandle) {
          clearInterval(room.timerHandle);
          room.timerHandle = null;
        }

        io.to(room.id).emit("game:over", {
          winner: "draw",
          reason: "draw_agreement",
          result: room.gameState.result,
        });
      } else {
        io.to(room.id).emit("game:draw_declined");
      }
    }, 1500);
  }

  /**
   * Handle rematch request when playing against AI bot.
   */
  public handleBotRematch(
    room: Room,
    io: SocketIOServer,
    onRoomTimeout: (r: Room, winner: string, timedOutPlayer: string, reason: any) => void,
    onTurnSkipped: (r: Room, skippedColor: string, nextTurn: string, afkStrikes: any) => void,
  ) {
    if (!room.isBotRoom || !room.gameState) {
      return;
    }

    setTimeout(() => {
      const oldW = room.players.w;
      const oldB = room.players.b;
      if (!oldW || !oldB) return;

      const newW = { ...oldB, color: "w" as PlayerColor };
      const newB = { ...oldW, color: "b" as PlayerColor };

      room.players.w = newW;
      room.players.b = newB;
      room.status = "playing";
      room.gameState = createInitialGameState(room.rulesetId, room.timeControl);
      room.drawOfferedBy = null;
      room.rematchRequestedBy = new Set();

      const game = room.gameState;
      roomManager.startTurnTimer(room, onRoomTimeout, onTurnSkipped);

      const humanPlayer = newW.isBot ? newB : newW;
      const botPlayer = newW.isBot ? newW : newB;

      const socket = io.sockets.sockets.get(humanPlayer.socketId);
      if (socket) {
        socket.emit("game:start", {
          roomId: room.id,
          sessionToken: humanPlayer.sessionToken,
          color: humanPlayer.color,
          opponent: {
            name: botPlayer.name,
            photoURL: null,
            rating: botPlayer.rating,
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
      }

      if (botPlayer.color === "w") {
        this.triggerBotMove(room, "w", io, onRoomTimeout, onTurnSkipped);
      }
    }, randomIntInclusive(900, 1_800));
  }
}

export const aiBotManager = new AIBotManager();
